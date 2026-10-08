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

When you upgrade the Kernel, the *in tree* modules work perfectly because they are already compiled inside the new Kernel. However, that’s not the case with your *out of tree* modules - they may break after a Kernel upgrade because it was compiled for the previous kernel version. 

You can resolve this by installing the Linux Headers for the new Kernel version and then compiling the modules again from source code. DKMS (Dynamic Kernel Module Support) automates this process - so you don’t have to worry about *out of tree* modules breaking after upgrading the Kernel. 

Hence DKMS method has become the favorite to install *out-of-tree* modules. However, not all module developers have support for DKMS.

DKMS also requires a `dkms.conf` file along with the source code to work.

### Install the required packages

`apt install dkms build-essential`

DKMS depends on binary build tools like `make`, `gcc`, `g++` etc. to work. You can install these using package bundle `apt install build-essential`

Install this meta package to automatically install the new kernel headers after a kernel upgrade: `apt install linux-headers-generic`

Install Kernel headers for your current version so we can install our first module with DKMS: `apt install linux-headers-$(uname -r)`

### Compile and add a new module through DKMS:

For every new module, follow the below steps to build, install and add it to DKMS so it auto rebuilds and install the module after a Kernel upgrade.

1. Download the source code and open the  `dkms.conf` file in it. If there’s no such file the developer hasn’t incorporated DKMS support.
    
    Note the `PACKAGE_VERSION` and `PACKAGE_NAME`.
    
2. Create a directory under /usr/src like `/usr/src/<PACKAGE_NAME>-<PACKAGE_VERSION>`
3. Copy the source code along with `dkms.conf` into `/usr/src/<PACKAGE_NAME>-<PACKAGE_VERSION>`
4. Add the module to DKMS’ tracking tree so it knows about it when Kernel upgrades.
    
    `sudo dkms add -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
5. Let’s build the module from source code
    
    `sudo dkms build -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
6. Let’s allow DKMS to drop the bundled binary in to the appropriate location for the Kernel
    
    `sudo dkms install -m <PACKAGE_NAME> -v PACKAGE_VERSION`
    
7. Check if DKMS has installed the module
    
    `sudo dkms status`
    
8. Load the module into Kernel
    
    `sudo modprobe <PACKAGE_NAME>`
    
9. Verify if the module is loaded into Kernel
    
    `sudo lsmod | grep -i <PACKAGE_NAME>`
    

### Remove a module that was previously installed through DKMS

1. Unload the module from Kernel
    
    `sudo modprobe -r <MODULE-NAME>`
    
2. Find the module version and name using
    
    `sudo dkms status`
    
3. Remove from DKMS database
    
    `sudo dkms remove <module>/<module-version> --all`
    
4. Remove the source code from under `/usr/src`

### Working with Secure Boot

If you have not setup an MOK (Machine Owner Key) before, DKMS auto generates a key pair for you and signs the module with the private key when you run `dkms build` . Of course this signing step is ignored if secure boot is disabled.

```bash
Sign command: /usr/lib/linux-kbuild-6.1/scripts/sign-file
Signing key: /var/lib/dkms/mok.key
Public certificate (MOK): /var/lib/dkms/mok.pub
Certificate or key are missing, generating self signed certificate for MOK...
```

If you want to use your own MOK key, tell DKMS where it is in `/etc/dkms/framework.conf` before running the build command.

Run `dkms install`

At this point if you try to load the module (`modprobe`) you’ll get an error because the UEFI firmware doesn’t have the corresponding public key to verify the module.

So add the pub key to UEFI firmware using  
`sudo mokutil --import /var/lib/dkms/mok.pub`

It’ll ask to input a password, you’ll need it after system reboot.

Reboot your system.

The UEFI firmware will present an MOK key management screen where you have to use the above password to confirm key upload. Here is a guide put together by the DKMS developers for the subsequent steps: https://github.com/dkms-project/dkms#secure-boot

Verify if key uploaded using  `mokutil --list-enrolled | grep DKMS`

Finally add module using `sudo modprobe <MODULE NAME>`

To learn about MOK, DKMS+Secure Boot, check out this doc from Debian: https://wiki.debian.org/SecureBoot#MOK_-_Machine_Owner_Key

### Troubleshooting Tips

- Check Kernel logs using `sudo dmesg -T -H | grep - i <module name>` or `journalctl -k`
- DKMS logs are under `/var/lib/<MODULE-NAME>/.../log/make.log`

### DKMS and Package Managers

Most modern modules are distributed through package repositories. They package their modules with DKMS config and distributed through package repositories. 

The package manager (apt, dnf, pacman … ) script basically automates all of the above steps to add, build, install and load modules using DKMS - thus simplifying the experience even further for the user.
