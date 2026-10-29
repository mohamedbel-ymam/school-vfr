<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Feuille d'émargement - {{ $degree->name }} - Semaine {{ $weekNumber }} ({{ $year }})</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 8mm;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 11px;
            background: #fff;
        }

        /* ---------------- Ancres visuelles (Fiducial markers) ---------------- */
        .corner-marker {
            position: absolute;
            width: 14mm;
            height: 14mm;
            background-color: #000000;
            z-index: 9999;
        }
        .marker-tl { top: 0; left: 0; }
        .marker-tr { top: 0; right: 0; }
        .marker-bl { bottom: 0; left: 0; }
        .marker-br { bottom: 0; right: 0; }

        /* ---------------- Conteneur principal ---------------- */
        .sheet-container {
            padding: 2mm 16mm 2mm 16mm;
            width: 100%;
            height: 100%;
        }

        /* ---------------- En-tête ---------------- */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .header-table td {
            vertical-align: middle;
        }

        .qr-col {
            width: 95px;
            text-align: left;
        }

        .qr-img {
            width: 90px;
            height: 90px;
            display: block;
        }

        .title-col {
            text-align: center;
            padding: 0 10px;
        }

        .title-main {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0;
        }

        .title-sub {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin-top: 3px;
        }

        .title-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }

        .instruction-col {
            width: 220px;
            text-align: right;
        }

        .instructions-box {
            border: 1.5px solid #000;
            background: #f8fafc;
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 9px;
            text-align: left;
            line-height: 1.35;
        }

        .instructions-box strong {
            display: block;
            font-size: 9.5px;
            color: #0f172a;
            margin-bottom: 2px;
            text-transform: uppercase;
        }

        .legend-item {
            margin-top: 2px;
        }

        .legend-box {
            display: inline-block;
            width: 11px;
            height: 11px;
            border: 1.5px solid #000;
            vertical-align: middle;
            margin-right: 4px;
            background: #fff;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
            line-height: 10px;
        }

        /* ---------------- Grille des cours et présences ---------------- */
        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .attendance-table th, 
        .attendance-table td {
            border: 1px solid #475569;
            padding: 4px 3px;
            text-align: center;
        }

        .attendance-table th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-size: 9.5px;
            font-weight: 700;
        }

        .col-index {
            width: 26px;
        }

        .col-matricule {
            width: 60px;
        }

        .col-student {
            width: 170px;
            text-align: left !important;
            padding-left: 6px !important;
        }

        /* En-tête des séances */
        .session-th {
            background-color: #f8fafc;
            padding: 3px 2px !important;
        }

        .session-day {
            font-size: 10px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
        }

        .session-date {
            font-size: 9px;
            color: #475569;
        }

        .session-time {
            font-size: 8.5px;
            color: #2563eb;
            font-weight: 600;
            margin-top: 1px;
        }

        .session-subject {
            font-size: 9px;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90px;
            margin: 1px auto 0 auto;
        }

        .session-teacher {
            font-size: 8px;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90px;
            margin: 0 auto;
        }

        .session-id-tag {
            display: inline-block;
            font-size: 7.5px;
            font-weight: 700;
            color: #475569;
            background: #e2e8f0;
            border-radius: 2px;
            padding: 0 3px;
            margin-top: 2px;
        }

        /* Lignes des étudiants */
        .student-row:nth-child(even) {
            background-color: #fcfcfd;
        }

        .student-name {
            font-weight: 600;
            color: #0f172a;
            font-size: 10px;
            text-transform: uppercase;
        }

        .student-matricule {
            font-family: monospace;
            font-size: 9.5px;
            color: #475569;
        }

        /* Case à cocher OMR (Optical Mark Recognition) */
        .checkbox-cell {
            padding: 3px !important;
            vertical-align: middle;
            text-align: center;
        }

        .omr-box {
            display: block;
            width: 17px;
            height: 17px;
            border: 2px solid #000000;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 2px;
        }

        /* ---------------- Pied de page ---------------- */
        .footer-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9px;
            color: #475569;
        }

        .sign-box {
            width: 140px;
            height: 40px;
            border: 1px dashed #94a3b8;
            margin-top: 3px;
            border-radius: 3px;
        }
    </style>
</head>
<body>

    <!-- 4 Ancres Visuelles d'alignement pour OMR / Redressement Scan -->
    <div class="corner-marker marker-tl"></div>
    <div class="corner-marker marker-tr"></div>
    <div class="corner-marker marker-bl"></div>
    <div class="corner-marker marker-br"></div>

    <div class="sheet-container">
        <!-- En-tête avec QR Code, Titre & Consignes -->
        <table class="header-table">
            <tr>
                <td class="qr-col">
                    <img src="{{ $qrBase64 }}" class="qr-img" alt="QR Code Semaine" />
                </td>
                <td class="title-col">
                    <h1 class="title-main">Fiche d'Émargement Hebdomadaire</h1>
                    <div class="title-sub">
                        Classe : <strong>{{ $degree->name }}</strong>
                        @if($group) — Groupe : <strong>{{ $group->name }}</strong>@endif
                    </div>
                    <div class="title-meta">
                        Semaine N° <strong>{{ $weekNumber }}</strong> | Année : <strong>{{ $year }}</strong>
                        &nbsp;•&nbsp; Période : <strong>Du {{ $startDate }} au {{ $endDate }}</strong>
                    </div>
                </td>
                <td class="instruction-col">
                    <div class="instructions-box">
                        <strong>Consignes d'Appel :</strong>
                        <div class="legend-item"><span class="legend-box"></span> <strong>Case VIDE</strong> = Présent</div>
                        <div class="legend-item"><span class="legend-box">&#10005;</span> <strong>Case COCHÉE (X)</strong> = Absent</div>
                        <div style="font-size: 8px; color: #64748b; margin-top: 3px;">
                            Ne pas froisser ni plier. Scanner à plat.
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Grille Dynamique : Colonnes = Séances effectives, Lignes = Étudiants -->
        <table class="attendance-table">
            <thead>
                <tr>
                    <th class="col-index">N°</th>
                    <th class="col-matricule">Matr.</th>
                    <th class="col-student">Étudiant (Nom & Prénom)</th>

                    @forelse($sessions as $session)
                        @php
                            $sessDate = \Carbon\Carbon::parse($session->session_date);
                            $dayName = $sessDate->locale('fr')->isoFormat('ddd');
                            $shortDate = $sessDate->format('d/m');
                            $timeStr = substr($session->start_time ?? '08:00', 0, 5) . ' - ' . substr($session->end_time ?? '09:30', 0, 5);
                            $subjName = $session->subject ? ($session->subject->code ?? $session->subject->name) : 'Cours';
                            $teacherName = $session->teacher ? $session->teacher->lastname : '';
                        @endphp
                        <th class="session-th" data-session-id="{{ $session->id }}">
                            <div class="session-day">{{ $dayName }}</div>
                            <div class="session-date">{{ $shortDate }}</div>
                            <div class="session-time">{{ $timeStr }}</div>
                            <div class="session-subject" title="{{ $session->subject?->name ?? 'Cours' }}">{{ $subjName }}</div>
                            @if($teacherName)
                                <div class="session-teacher">{{ $teacherName }}</div>
                            @endif
                            <div class="session-id-tag">S#{{ $session->id }}</div>
                        </th>
                    @empty
                        <th style="padding: 15px; color: #ef4444;">Aucun cours planifié pour cette semaine</th>
                    @endforelse
                </tr>
            </thead>
            <tbody>
                @forelse($students as $idx => $student)
                    <tr class="student-row">
                        <td class="col-index">{{ $idx + 1 }}</td>
                        <td class="col-matricule student-matricule">#{{ str_pad($student->id, 4, '0', STR_PAD_LEFT) }}</td>
                        <td class="col-student student-name">
                            {{ $student->lastname }} {{ $student->firstname }}
                        </td>

                        @foreach($sessions as $session)
                            <td class="checkbox-cell" data-student-id="{{ $student->id }}" data-session-id="{{ $session->id }}">
                                <div class="omr-box"></div>
                            </td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($sessions) + 3 }}" style="padding: 20px; color: #64748b;">
                            Aucun étudiant inscrit dans cette classe.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Pied de page avec validation & signatures -->
        <table class="footer-table">
            <tr>
                <td style="width: 50%;">
                    <div>Fiche générée le {{ now()->locale('fr')->isoFormat('LLLL') }}</div>
                    <div style="font-size: 8px; color: #94a3b8; margin-top: 1px;">
                        Identifiant document: CL-{{ $degree->id }}-W{{ $weekNumber }}-{{ $year }}-V1
                    </div>
                </td>
                <td style="width: 25%; text-align: center;">
                    <div>Visa Responsable Pédagogique :</div>
                    <div class="sign-box" style="margin: 3px auto 0 auto;"></div>
                </td>
                <td style="width: 25%; text-align: right;">
                    <div>Signature / Cachet Administration :</div>
                    <div class="sign-box" style="margin: 3px 0 0 auto;"></div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
