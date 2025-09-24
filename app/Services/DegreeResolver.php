<?php
// app/Services/DegreeResolver.php
namespace App\Services;

use Illuminate\Support\Facades\DB;

class DegreeResolver
{
    private array $map = [
        'college-3eme' => [
            '3ème année collège','first','première année collège','1ère année collège',
            '1er année collège','2ème année collège','2eme annee college','2eme année collège','2éme année college'
        ],
        'tronc-commun' => [
            'tronc commun','second','deuxième année collège','3ème année collège','troisième année collège'
        ],
        'bac1-se' => ['1er année bac (se)','third','tronc commun','tronc-commun'],
        'bac1-sm' => ['1er année bac (sm)','fourth','1ère année bac','1er année bac','première année bac'],
        'bac2'    => ['2ème année bac','final','2eme annee bac','bac 2'],
    ];

    public function resolveToId(string|int|null $val): ?int
    {
        if ($val === null || $val === '') return null;

        // 1) Si int → vérifie qu’il est canonique
        if (is_numeric($val)) {
            $id = (int)$val;
            $slug = DB::table('degrees')->where('id',$id)->value('slug');
            return $slug ? $id : null;
        }

        $s = mb_strtolower(trim($val));

        // 2) Slug direct
        $id = DB::table('degrees')->where('slug',$s)->value('id');
        if ($id) return $id;

        // 3) Alias → slug → id
        foreach ($this->map as $slug => $aliases) {
            $aliasesL = array_map(fn($a)=>mb_strtolower($a), $aliases);
            if (in_array($s, $aliasesL, true)) {
                return DB::table('degrees')->where('slug',$slug)->value('id');
            }
        }

        // 4) Tenter match exact par name canonique
        $id = DB::table('degrees')
            ->whereNotNull('slug')
            ->whereRaw('LOWER(name)=?', [$s])
            ->value('id');

        return $id ?: null;
    }
}
