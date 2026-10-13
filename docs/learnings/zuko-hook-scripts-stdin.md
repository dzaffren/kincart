# Pipe {} into zuko's Stop-hook scripts when running them by hand

**Learned:** 2026-10-13 · **From:** /spec find-and-explain

`verify-gates.sh` is a Stop hook and reads the hook's JSON from stdin. Run from a shell with nothing on stdin, it waits forever.

Wrong: `bash .../scripts/verify-gates.sh`

Right: `echo '{}' | bash .../scripts/verify-gates.sh`
