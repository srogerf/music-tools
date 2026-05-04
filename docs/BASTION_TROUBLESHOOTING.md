# Bastion Troubleshooting

This note captures the repeated OCI Bastion tunnel triage flow.

## Normal Start

Start the SSH tunnel:

```bash
bash bin/oci_bastion_ssh.sh --new-session --no-ssh
```

Start the reverse proxy tunnel after the SSH tunnel is ready:

```bash
bash bin/oci_bastion_proxy_tunnel.sh
```

## Common Failure

The most common transient failure is:

```text
Permission denied (publickey).
```

If the local Bastion private/public key pair matches, this can still happen
briefly after OCI reports the Bastion session work request as `SUCCEEDED`.
The session may not accept the SSH public key immediately.

The SSH wrapper now retries tunnel startup on that exact public-key failure.
The defaults are:

```bash
BASTION_TUNNEL_START_ATTEMPTS=12
BASTION_TUNNEL_START_WAIT_SECONDS=5
```

The proxy wrapper waits longer for the SSH tunnel because the SSH wrapper may
be retrying OCI key propagation:

```bash
BASTION_PROXY_SSH_READY_ATTEMPTS=90
BASTION_PROXY_SSH_READY_WAIT_SECONDS=1
```

## Triage Commands

Clear duplicate or stale active sessions:

```bash
bash bin/oci_bastion_ssh.sh --cleanup-sessions
```

Verify the Bastion key pair:

```bash
ssh-keygen -lf .private/keys/oci_bastion_ed25519.pub
ssh-keygen -y -f .private/keys/oci_bastion_ed25519 | ssh-keygen -lf -
```

The two fingerprints should match.

Check active OCI Bastion sessions:

```bash
set -a
. .private/bastion/music-tools.env
set +a
SUPPRESS_LABEL_WARNING=True ~/bin/oci bastion session list \
  --bastion-id "$BASTION_ID" \
  --display-name "$BASTION_SESSION_DISPLAY_NAME" \
  --session-lifecycle-state ACTIVE \
  --sort-by timeCreated \
  --sort-order DESC \
  --all \
  --output json
```

Verbose SSH probe for the newest session:

```bash
ssh -vvv \
  -i .private/keys/oci_bastion_ed25519 \
  -N \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -L 2229:10.0.2.7:22 \
  -p 22 \
  "$SESSION_ID@host.bastion.us-phoenix-1.oci.oraclecloud.com"
```

If the verbose probe says `Server accepts key` and then authenticates, the
Bastion session/key pair is good.

## Notes

- `--new-session` now clears active sessions with the same display name before
  creating a fresh session.
- `--cleanup-sessions` only deletes OCI sessions; it does not stop local SSH
  processes.
- If local port `2222` is already accepting TCP connections, the SSH wrapper
  stops early instead of trying to start a second tunnel on the same port.
- The Bastion tunnel key and the instance SSH key are separate. The Bastion
  tunnel uses `BASTION_SSH_KEY`; the private instance login uses
  `INSTANCE_SSH_KEY`.
