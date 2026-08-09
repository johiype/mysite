---
author: Johith Iype
pubDatetime: 2026-07-21T04:58:53Z
modDatetime: 2026-07-21T00:00:00.000Z
title: NextCloud LAMP Stack Upgrade Guide
slug: nextcloud-lamp-stack-upgrade-guide
featured: false
draft: false
hideEditPost: true
tags:
  - homeserver
description: A short guide on how to upgrade a NextCloud LAMP stack based server.
---

This is a quick guide I put together to help me upgrade LAMP stack installation of the NextCloud server. 

## Before you hit the Update button …

1. **Check if your current server don’t have any problems ..**
    
    Check if everything is connected and working: `sudo -u www-data php occ check`
    
    Verifies dependencies, database connections, file integrity and bunch of other tests.
    
    Do a quick status check: `sudo -E -u www-data php occ status`
    
2. **Take backup or VM snapshot of your server**
    
    Running NextCloud on a bare metal host? checkout: https://docs.nextcloud.com/server/stable/admin_manual/maintenance/backup.html
    
    Before you do anything, put nextcloud in maintenance mode: `sudo -u www-data php occ maintenance:mode --on`
    
3. **Let’s do the upgrade….**
    
    `sudo -E -u www-data php /var/www/nextcloud/updater/updater.phar`
    
    !image.png
    
4. **After successful upgrade, check if everything's okay…**
    
    Verify new server version:
    
    `sudo -E -u www-data php occ -V`
    
    Check nextcloud server status:
    `sudo -E -u www-data php occ status`
    
    Check if everything is connected and working: `sudo -u www-data php occ check`
    
    Login to NXT and see if you can view, edit, delete and move files. You may want to edit 
    
    Check if NextCloud’s cron jobs are working:
    
    Admin *Settings in dashboard* > *Basic Settings*
    
    !image.png
    
    Check if the installed Apps are working. Profile picture > Apps > Active Apps
    
    If you see *disabled*  or *require update*, update them.
    

---

# Upgrading php

You may want to upgrade your php to support the latest NextCloud versions and also patch any vulnerabilities. 

You can upgrade php in two ways:

- Upgrade your host machine to receive the latest php version
- Upgrade php through non official package repository like Ondrej’s (if your current distro version doesn’t provide latest php from it’s official repos.)

### php modules

There are required modules, recommended modules and modules to extend nextcloud capabilites (like adding LDAP login). You can see a table of this list here (version 32): https://docs.nextcloud.com/server/32/admin_manual/installation/php_configuration.html

It’s also a good idea to save a list of all the current php modules to your workstation before beginning any host or php update.

I came across a situation when after upgrading Ubuntu the LDAP php module just disappeared so having a list of modules might save you the headache of trying to figure out missing modules when you can easily do a comparison post-upgrade and re-install the missing modules. 

List all loaded php modules: `php -m`

List all loaded php modules and their versions:

`php -r '$all = get_loaded_extensions(); foreach($all as $i) { $ext = new ReflectionExtension($i); $ver = $ext->getVersion(); echo "$i - $ver" . PHP_EOL;}'`

https://gist.github.com/medeirosinacio/a0e8bf7edf4390cf6c44491f94a95ef9

Upgrading PHP:

```powershell
sudo apt update
sudo apt install php8.3

# refer to the version of Nextcloud for the actual list of required php modules!!!
sudo apt install php8.3-imap php8.3-curl \
php8.3-intl php8.3-ldap php8.3-exif \
php8.3-ftp php8.3-phar php8.3-sysvsem \
php8.3-gmp php8.3-ctype php8.3-pcntl \
php8.3-redis php8.3-apcu 

# if using apache2 as web server for nextcloud
# make apache2 switch from using php version 8.1 to 8.3
# IF your apache2 already using mod_php (see section below), then
sudo a2dismod php8.1
sudo a2enmod php8.3
sudo systemctl restart apache2

# IF your apache2 using php-fpm (see section below), then 
sudo a2disconf php8.1-fpm
sudo a2enconf php8.3-fpm
sudo systemctl restart apache2

#After this you are going to have both php versions installed on your system. 
# Set 8.4 as your default php on the cli. Below command will also handle switching to
# using the modules under the version you select.
sudo update-alternatives --config php

# IF USING php-fpm module, restart it for good measure
sudo systemctl restart php8.3-fpm.service

# Give apache a restart so the new configs kick in
sudo systemctl restart apache2.service

# verify php vesion
php -v

# Use below to list all loaded/active modules and their versions
# run through the printed list and just make sure eveyrthing required 
# by the NXT version has loaded
php -r '$all = get_loaded_extensions(); foreach($all as $i) { $ext = new ReflectionExtension($i); $ver = $ext->getVersion(); echo "$i - $ver" . PHP_EOL;}'

# thanks random reddit user for listing some of the steps
# https://www.reddit.com/r/NextCloud/comments/13cqdr1/php_upgrade_steps/
```

### Edit *php.ini* config file

Let's tweak `php.ini` file to optimize php for your nextcloud server. 

If using php-fpm: `/etc/php/8.3/fpm/php.ini`

For mod_php: `/etc/php/8.3/apache2/php.ini`

Required and some commonly edited variables in php.ini especially for nextcloud:
`memory_limit, upload_max_filesize, post_max_size, max_execution_time, max_input_time, opcache.enable, upload_tmp_dir, open_basedir`


### `mod_php` vs `php-fpm` for Apache (notes)

The Apache2 server interfaces with php in two ways: the legacy `mod_php` module or `php-fpm` service (recommended).

`mod_php` module is embedded within apache server while `php-fpm` is a separate service that apache connects to.

To find what your apache2 is using:

```bash
ls -la /etc/apache2/conf-enabled/ | grep -E "php|fpm"
ls -la /etc/apache2/mods-enabled/ | grep -E "php|fpm"
```

If you see fpm in the list you are using `php-fpm` service. If you see file links like `phpx.y.load` and `phpX.Y.conf` then it’s the legacy `mod_php`.

`a2enmod`  command basically creates soft links inside inside `/etc/apache2/mods-enabled/` to the modules. `a2dismod` deletes the link.

---

## MariaDB Notes

Upgrade the MariaDB Database Schema

`sudo mariadb-upgrade`

Missing indices error after an upgrade? run below:

```bash
sudo -u www-data php /var/www/nextcloud/occ db:add-missing-indices
sudo -u www-data php /var/www/nextcloud/occ maintenance:repair
```

# Troubleshooting

### NextCloud Logs

Logs are in file `/var/www/nextcloud/data/nextcloud.log` in JSON format.

To parse JSON for viewing: `sudo tail -f /var/www/fileshare/data/nextcloud.log | jq`

# Notes

- The HTTP user is different on the various Linux distributions:
    - The HTTP user and group in Debian/Ubuntu is `www-data`.
    - The HTTP user and group in Fedora/CentOS is apache.
    - The HTTP user and group in Arch Linux is http.
    - The HTTP user in openSUSE is wwwrun, and the HTTP group is www.
- Php updater script provided by a Nextcloud community member - takes care of updating php for you
    
    https://help.nextcloud.com/t/php-updater-a-script-to-upgrade-php-in-a-safe-way/180215
    
- When upgrading your host, you may want to keep you current configs intact and not let the package manager override it
    
    !image.png












