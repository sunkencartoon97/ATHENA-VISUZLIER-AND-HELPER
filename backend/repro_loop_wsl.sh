#!/bin/bash
for i in $(seq 1 20); do
  echo "--- run $i ---"
  cat /mnt/c/project/UMANG/athena/backend/tmp_payload.json | /mnt/c/project/UMANG/athena/engine/build/bin/athena_engine >/mnt/c/project/UMANG/athena/backend/wsl_run_${i}.out 2>&1
  echo "exit:$?"
done
