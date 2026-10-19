---
author: Johith Iype
pubDatetime: 2026-06-26T04:58:53Z
modDatetime: 2026-06-26T00:00:00.000Z
title: Manage out-of-tree Linux Kernel Modules using DKMS (Dynamic Kernel Module Support)
slug: manage-out-of-tree-linux-kernel-modules-using-dkms
featured: true
draft: false
hideEditPost: true
tags:
  - Linux
description: Learn how to use DKMS (Dynamic Kernel Module Support) to build and install out-of-tree Kernel modules and how to configure it to automatically rebuild and install the modules again after a Kernel upgrade.
---

When you upgrade a Linux Kernel, the out-of-tree modules may break because they were compiled for the previous Kernel version. Normally you resolve this by installing the Linux Headers for the new Kernel version and then compiling the modules again from source and loading them in to the Kernel. 

DKMS (Dynamic Kernel Module Support) automates this process for you for every Kernel upgrade so you don’t have to worry about your *out of tree* modules breaking and having to manually compile and load them again. 

## Pre-Requisites before proceeding

- Tools required
    - `dkms` package
    - Kernel Headers meta package
    - build/compile tools
- Module source code
    - It should contain `dkms.conf` file
    - It should contain `Makefile`
- Root privileges

## Let’s install the required packages

`apt install dkms build-essential`

DKMS depends on binary build tools like `make`, `gcc`, `g++` etc. to work. You can install these using a package bundle `apt install build-essential`

Install this meta package to automatically install the new kernel headers after a kernel upgrade: `apt install linux-headers-generic`

Install Kernel headers for your current version so we can install our first module with DKMS: `apt install linux-headers-$(uname -r)`

## Let’s see how to compile and add a module through DKMS

1. Download the source code and open the  `dkms.conf` file in it. 
    
    If it’s missing, you may have to create one which I’m not covering in this article.
    
    Note the `PACKAGE_VERSION` and `PACKAGE_NAME`.
    
2. Create a directory under `/usr/src` like `/usr/src/<PACKAGE_NAME>-<PACKAGE_VERSION>`
3. Copy the source code (along with `dkms.conf` )into `/usr/src/<PACKAGE_NAME>-<PACKAGE_VERSION>`
4. Add the module to DKMS’ tracking tree so it knows about it when the Kernel upgrades.
    
    `sudo dkms add -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
    Note: This basically creates a symlink from `/usr/src/<PACKAGE_NAME>-<PACKAGE_VERSION>` to 
    `/var/lib/dkms/<PACKAGE_NAME>/<PACKAGE_VERSION>/source`
    
5. Let’s build the module from source code
    
    `sudo dkms build -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
    Note: Some modules depend on other modules to function. When you’re building a module using DKSM, it may also build and install it’s dependency modules. You can check this by reading the `dkms.conf` file. Look for `BUILT_MODULE_NAME` variable.
    
    Example:
    
    ![DKMS-config-file](@/assets/images/dkmsconf.png)
    
6. Install the compiled module (not loading into Kernel)
    
    `sudo dkms install -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
7. Test if DKMS has properly installed the module - ie. dropped the compiled module file to the proper location for the Kernel which is under `/lib/modules/<kernel-version>/` .
    
    `sudo dkms status`
    
8. Finally let’s load the module into the Kernel
    
    `sudo modprobe <PACKAGE_NAME>`
    
    Note: If you’re getting an error: *modprobe: ERROR: could not insert 'veeamblksnap': Key was rejected by service* - it’s because your UEFI firmware has secure boot enabled and it doesn’t have the corresponding public key to verify the module before loading it into the Kernel.
    
    Refer below section on how to add the key to firmware and resume from this step.
    
9. Verify if the module is loaded into Kernel
    
    `sudo lsmod | grep -i <PACKAGE_NAME>`
    
10. Configure to load module on system bootup
    
    This may vary between systems. If you’re using systemd, then create a config file under `/etc/modules-load.d/my_module_name.conf` and add the module name in it.
    

## Removing a module that was previously installed through DKMS

1. Unload the module from Kernel
    
    `sudo modprobe -r <MODULE-NAME>`
    
2. Find the module version and name using
    
    `sudo dkms status`
    
3. Remove from DKMS database
    
    `sudo dkms remove <module>/<module-version> --all`
    
4. Remove the source code from under `/usr/src`
5. Remove auto load config file from under `/etc/modules-load.d/`

## Let’s see how to load modules with Secure Boot enabled

If you have not setup an MOK (Machine Owner Key) before, DKMS auto generates a key pair for you and signs the module with the private key when you run `dkms build` command.
![DKMS-secure-boot](@/assets/images/dkmsmok.png)

 Of course this signing step is ignored if secure boot is disabled.

If you want to use your own MOK key, tell DKMS where it is in `/etc/dkms/framework.conf` under `mok_signing_key=` variable before running the build command. Then run `dkms install` .

At this point if you try to load the module (`modprobe`) you’ll get an error because the UEFI firmware doesn’t have the corresponding public key to verify the module.

So add the pub key to the UEFI firmware using  
`sudo mokutil --import /var/lib/dkms/mok.pub`

It’ll ask to input a password, you’ll need it later.

Reboot your system.

The UEFI firmware will present an MOK Management screen where you have to use the above password to confirm key upload. 

![MOK-Management-Screen](@/assets/images/dkmsmokmanagement.png)

Here is a guide put together by the DKMS developers on how to verify the key upload from the MOK management screen: https://github.com/dkms-project/dkms#secure-boot

After logging in, verify if the key has been successfully uploaded using  `mokutil --list-enrolled | grep -i DKMS`

Finally add the module using `sudo modprobe <MODULE NAME>`

To learn about MOK, DKMS+Secure Boot, check out this doc from Debian: https://wiki.debian.org/SecureBoot#MOK_-_Machine_Owner_Key

## Troubleshooting Tips

- Check Kernel logs using `sudo dmesg -T -H | grep - i <module name>` or `journalctl -k`
- DKMS logs are under `/var/lib/<MODULE-NAME>/.../log/make.log`

## Package Managers and DKMS

Most modern modules are distributed through package repositories. They package their modules with DKMS config and distributed through package repositories. 

The package manager (apt, dnf, pacman … ) script basically automates all of the above steps to add, build, install and load modules using DKMS - thus simplifying the experience for the user.
