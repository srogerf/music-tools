#!/usr/bin/env bash

sudo pg_ctlcluster 16 main start
sudo -u postgres psql -p 5435
