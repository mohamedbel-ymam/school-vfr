<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use File;

class ClearLogs extends Command
{
    protected $signature = 'log:clear';
    protected $description = 'Clear all log files';

    public function handle()
    {
        $logPath = storage_path('logs');
        File::cleanDirectory($logPath);

        $this->info('Logs have been cleared!');
    }
}
