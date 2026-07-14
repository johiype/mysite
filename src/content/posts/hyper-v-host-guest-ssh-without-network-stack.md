---
author: Johith Iype
pubDatetime: 2026-07-07T04:58:53Z
modDatetime: 2026-07-07T00:00:00.000Z
title: Hyper-V Host and Guest SSH without Network Stack
slug: hyper-v-host-guest-ssh-without-network-stack
featured: true
draft: false 
hideEditPost: true
tags:
  - AdminTool
  - Hypervisor
description: How to establish SSH connection between your Hyper-V Host and Guest OS without a Network Setup.
---

You can communicate with your Virtual Machines (run commands, SSH, Netcat sessions) from your Hyper-V host without any network stack (TCP/IP, APIs, switches etc.).

Hyper-V utilizes VMBus to make this work. They developed VMBus (Virtual Machine Bus) which is a shared communication channel between guest and host systems.

VMBus is based on the concept of inter-partition communication (which went waaay over my hear).

We can utilize this channel to tunnel an SSH session between the guest VMs and the host hypervisor.

To tap in this shared communication channel, guest and the host must have the necessary Kernel modules loaded.

I’m using a Linux guest to explain how this works.


## Kernel Modules: vsock and hv_sock

On a Hyper-V Linux guest, you have to load two modules: vsock and hv_sock

**vsock** is a host agnostic module that "facilitates communication between virtual machines and the host they are running on.  This address family is used by guest agents and hypervisor services that need a communications channel that is independent of virtual machine network configuration." Ref: https://man7.org/linux/man-pages/man7/vsock.7.html

**hv_sock** works alongside vsock to translate data to Hyper-V specific commands.

I like to imagine the VMBus as a highly secure, restricted super-highway that runs between the VMs and the hypervisor/host. Both the VMs and the host taps into this highway using supporting OS kernel modules. Through this highway, SSH packets can be transferred as well.

## Loading vsock and hv_sock modules

Okay, let's start by loading the required modules on your guest Linux kernel

To load vsock:

`modprobe vsock`

`lsmod | grep vsock`

To load Hyper-V’s module:

`modprobe hv_sock`

`lsmod | grep hv_sock`

You may also have to auto load theses modules on system boot by adding them under `/etc/modules-load.d/`

## Create SystemD socket enabled SSH

Create a systemd socket unit, `sshd-vsock.socket`,  that listens for incoming requests through a port exposed on vsock

```bash
[Unit]
Description= Socket enabled SSH instance to utilize VSOCK

[Socket]
#vsock:CID:port
ListenStream=vsock::22
Accept=yes

[Install]
WantedBy=sockets.target
```

Then, it's corresponding service file,  `ssh-vsock@.service` to spawn an sshd process: 

```bash
[Unit]
Description=OpenSSH per-connection daemon (VSOCK)
After=auditd.service

[Service]
EnvironmentFile=-/etc/default/ssh
ExecStart=-/usr/sbin/sshd -i $SSHD_OPTS
StandardInput=socket
RuntimeDirectory=sshd
```

Load the new socket unit files:

`systemctl daemon-reload`

`systemctl enable --now sshd-vsock.socket`

`systemctl start sshd-vsock.socket`

## SYSTEMD-SSH-GENERATOR 
On modern Linux distros like Debian 13 and RHEL 9, they use a systemd generator `SYSTEMD-SSH-GENERATOR` to automatically create the above unit files and deploy a socket activated SSH server through AF_VSOCK sockets on guest system boot up.

However, for me for some reason my test Debian VM (which I had to upgrade from version 12 to 13 for the SYSTEMD-SSH-GENERATOR generator file) wasn't generating the required socket files so I went ahead and created them manually as seen above. Perhaps if I tried this on a fresh Debian 13 instance, it may have worked?

I had a working RHEL 9 instance so I pulled it aside and copied over it's socket file over to my working Debian instance. Some of the socket unit file parameters in RHEL were ignored by the Debian's systemd, so I'm ignoring them above.

Read about SYSTEMD-SSH-GENERATOR here: https://manpages.debian.org/trixie/systemd/systemd-ssh-generator.8.en.html

## hvc.exe Windows Utility

Hyper-V provides a CLI tool hvc.exe to configure and interact with the hypervisor engine from the Windows host. It also exposes functionalities that allows you to tunnel an SSH session through the VMBus channel, which we will be using like so:

`hvc ssh username@VM-NAME`

## Troubleshooting Steps:

#### Check if vsock is listening on your specified port

`ss -l --socket=vsock`

#### Check systemd journals of sshd-vsock.socket


