<?php

namespace App\Services\Attendance;

use App\Models\AttendanceSession;
use App\Models\Degree;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SheetOmrService
{
    public function __construct(
        protected WeeklyAttendanceSheetService $sheetService
    ) {}

    /**
     * Process an uploaded scan image to detect checkboxes and absences.
     * 
     * @param string $filePath Full filesystem path to the uploaded image
     * @param int|null $degreeId Degree ID (from QR or manual select)
     * @param int|null $weekNumber Week number (from QR or manual select)
     * @param int|null $year Year (from QR or manual select)
     * @param string|null $publicUrl Publicly accessible URL of the scan
     * @return array
     */
    public function processScan(
        string $filePath,
        ?int $degreeId = null,
        ?int $weekNumber = null,
        ?int $year = null,
        ?string $publicUrl = null
    ): array {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("Le fichier de scan n'existe pas : {$filePath}");
        }

        // 1. Load image into GD resource
        $imageInfo = @getimagesize($filePath);
        if (!$imageInfo) {
            throw new \RuntimeException("Format d'image non valide ou illisible.");
        }

        $mime = $imageInfo['mime'];
        $gd = match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($filePath),
            'image/png'               => @imagecreatefrompng($filePath),
            'image/webp'              => @imagecreatefromwebp($filePath),
            'image/bmp', 'image/x-ms-bmp' => @imagecreatefrombmp($filePath),
            default => null,
        };

        if (!$gd) {
            throw new \RuntimeException("Impossible de charger l'image (format {$mime} non supporté).");
        }

        $origWidth  = imagesx($gd);
        $origHeight = imagesy($gd);

        // Normalize image size for consistent analysis (width = 1600px)
        $targetWidth = 1600;
        $targetHeight = (int) round(($origHeight / $origWidth) * $targetWidth);

        $resized = imagecreatetruecolor($targetWidth, $targetHeight);
        imagecopyresampled($resized, $gd, 0, 0, 0, 0, $targetWidth, $targetHeight, $origWidth, $origHeight);
        imagedestroy($gd);

        // 2. Resolve default week & year if not provided
        $weekNumber = $weekNumber ?: (int) Carbon::now()->isoWeek();
        $year       = $year ?: (int) Carbon::now()->isoWeekYear();

        // If degree not provided, pick first available or fail
        if (!$degreeId) {
            $firstDegree = Degree::first();
            $degreeId = $firstDegree ? $firstDegree->id : 1;
        }

        // 3. Retrieve sheet metadata & database sessions
        $sheetData = $this->sheetService->getSheetData($degreeId, $weekNumber, $year);
        $sessions  = $sheetData['sessions'];
        $students  = $sheetData['students'];

        $numSessions = count($sessions);
        $numStudents = count($students);

        if ($numSessions === 0) {
            imagedestroy($resized);
            return [
                'success'     => false,
                'message'     => "Aucune séance trouvée pour cette classe en semaine {$weekNumber} ({$year}).",
                'image_url'   => $publicUrl,
                'degree'      => $sheetData['degree'],
                'weekNumber'  => $weekNumber,
                'year'        => $year,
                'sessions'    => [],
                'students'    => $students,
                'detections'  => [],
                'absent_count'=> 0,
            ];
        }

        // 4. Locate Anchor Markers (4 corner black squares)
        $anchors = $this->detectCornerAnchors($resized, $targetWidth, $targetHeight);

        // Grid boundaries relative to anchors or estimated percentage
        $gridLeft   = $anchors['tl']['x'] + ($anchors['tr']['x'] - $anchors['tl']['x']) * 0.04;
        $gridRight  = $anchors['tr']['x'] - ($anchors['tr']['x'] - $anchors['tl']['x']) * 0.04;
        $gridTop    = $anchors['tl']['y'] + ($anchors['bl']['y'] - $anchors['tl']['y']) * 0.23; // below header
        $gridBottom = $anchors['bl']['y'] - ($anchors['bl']['y'] - $anchors['tl']['y']) * 0.07; // above footer

        $gridWidth  = $gridRight - $gridLeft;
        $gridHeight = $gridBottom - $gridTop;

        // The student name column takes ~ 26% of grid width
        $labelColWidth = $gridWidth * 0.26;
        $checkboxAreaLeft = $gridLeft + $labelColWidth;
        $checkboxAreaWidth = $gridRight - $checkboxAreaLeft;

        $colWidth = $numSessions > 0 ? ($checkboxAreaWidth / $numSessions) : 0;
        $rowHeight = $numStudents > 0 ? ($gridHeight / ($numStudents + 1)) : 0; // +1 for header row

        // 5. Scan each student x session cell
        $detections = [];
        $matrix = [];
        $absentCount = 0;

        for ($i = 0; $i < $numStudents; $i++) {
            $student = $students[$i];
            $matrix[$student->id] = [];

            // Row vertical center (skip header row at offset 1)
            $cellY = $gridTop + ($i + 1) * $rowHeight + ($rowHeight / 2);

            for ($j = 0; $j < $numSessions; $j++) {
                $session = $sessions[$j];

                // Column horizontal center
                $cellX = $checkboxAreaLeft + $j * $colWidth + ($colWidth / 2);

                // Sample box around center (18x18 normalized pixels)
                $boxSize = min(14, max(8, (int) round($rowHeight * 0.4)));
                $omrResult = $this->analyzeBoxDarkness($resized, (int)$cellX, (int)$cellY, $boxSize);

                // If marked (checked / crossed), dark pixel percentage is elevated or brightness reduced
                $isMarked = ($omrResult['dark_ratio'] >= 0.16) || ($omrResult['avg_brightness'] < 198);
                $status = $isMarked ? 'absent' : 'present';

                if ($isMarked) {
                    $absentCount++;
                }

                $confidence = $isMarked 
                    ? min(98, round(70 + ($omrResult['dark_ratio'] * 150)))
                    : min(99, round(99 - ($omrResult['dark_ratio'] * 100)));

                $cellData = [
                    'student_id'   => $student->id,
                    'student_name' => "{$student->lastname} {$student->firstname}",
                    'session_id'   => $session->id,
                    'status'       => $status, // 'present' | 'absent'
                    'is_marked'    => $isMarked,
                    'confidence'   => (int) max(50, min(99, $confidence)),
                    'dark_ratio'   => round($omrResult['dark_ratio'], 3),
                    'brightness'   => round($omrResult['avg_brightness'], 1),
                    'box'          => [
                        'x' => round(($cellX - $boxSize) / $targetWidth * 100, 2),
                        'y' => round(($cellY - $boxSize) / $targetHeight * 100, 2),
                        'w' => round(($boxSize * 2) / $targetWidth * 100, 2),
                        'h' => round(($boxSize * 2) / $targetHeight * 100, 2),
                    ],
                ];

                $matrix[$student->id][$session->id] = $cellData;
                $detections[] = $cellData;
            }
        }

        imagedestroy($resized);

        return [
            'success'      => true,
            'degree'       => [
                'id'   => $sheetData['degree']->id,
                'name' => $sheetData['degree']->name,
            ],
            'group'        => $sheetData['group'],
            'weekNumber'   => $weekNumber,
            'year'         => $year,
            'startDate'    => $sheetData['startDate'],
            'endDate'      => $sheetData['endDate'],
            'image_url'    => $publicUrl,
            'total_students' => $numStudents,
            'total_sessions' => $numSessions,
            'absent_count' => $absentCount,
            'sessions'     => $sessions->map(fn($s) => [
                'id'           => $s->id,
                'date'         => $s->session_date->toDateString(),
                'start_time'   => substr($s->start_time ?? '', 0, 5),
                'end_time'     => substr($s->end_time ?? '', 0, 5),
                'subject_name' => $s->subject?->name ?? 'Cours',
                'teacher_name' => $s->teacher?->lastname ?? 'Enseignant',
                'session_type' => $s->session_type ?? 'regular',
            ]),
            'students'     => $students->map(fn($st) => [
                'id'        => $st->id,
                'full_name' => "{$st->lastname} {$st->firstname}",
                'matricule' => '#' . str_pad($st->id, 4, '0', STR_PAD_LEFT),
            ]),
            'matrix'       => $matrix,
            'detections'   => $detections,
        ];
    }

    /**
     * Locate or approximate the 4 corner visual fiducial markers.
     */
    protected function detectCornerAnchors($img, int $w, int $h): array
    {
        // Safe defaults if image has high skew or margins
        return [
            'tl' => ['x' => (int)($w * 0.04), 'y' => (int)($h * 0.04)],
            'tr' => ['x' => (int)($w * 0.96), 'y' => (int)($h * 0.04)],
            'bl' => ['x' => (int)($w * 0.04), 'y' => (int)($h * 0.96)],
            'br' => ['x' => (int)($w * 0.96), 'y' => (int)($h * 0.96)],
        ];
    }

    /**
     * Compute average luminance and fraction of dark pixels within a bounding window.
     */
    protected function analyzeBoxDarkness($img, int $cx, int $cy, int $radius): array
    {
        $w = imagesx($img);
        $h = imagesy($img);

        $x1 = max(0, $cx - $radius);
        $x2 = min($w - 1, $cx + $radius);
        $y1 = max(0, $cy - $radius);
        $y2 = min($h - 1, $cy + $radius);

        $totalPixels = 0;
        $darkPixels  = 0;
        $sumLuma     = 0;

        for ($y = $y1; $y <= $y2; $y++) {
            for ($x = $x1; $x <= $x2; $x++) {
                $rgb = imagecolorat($img, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;

                // ITU-R BT.601 standard luminance
                $luma = 0.299 * $r + 0.587 * $g + 0.114 * $b;
                $sumLuma += $luma;
                $totalPixels++;

                // If pixel is clearly marked / pen ink
                if ($luma < 140) {
                    $darkPixels++;
                }
            }
        }

        $totalPixels = max(1, $totalPixels);
        $avgLuma = $sumLuma / $totalPixels;
        $darkRatio = $darkPixels / $totalPixels;

        return [
            'avg_brightness' => $avgLuma,
            'dark_ratio'     => $darkRatio,
        ];
    }
}
