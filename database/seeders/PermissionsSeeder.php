<?php
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

$perm = Permission::firstOrCreate(['name' => 'manage attendance']);
Role::findByName('admin')->givePermissionTo($perm);
Role::findByName('superadmin')->givePermissionTo($perm);