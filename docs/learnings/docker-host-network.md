# Run local Postgres containers with --network host on this machine

**Learned:** 2026-10-12 · **From:** /build skeleton

On this workstation the host cannot reach Docker's bridge network: a `-p 54329:5432` mapping accepts the TCP connection but the Postgres handshake times out, inside or outside the shell sandbox. Postgres never logs the attempt. Host networking works.

Wrong: `docker run -d --name shop-together-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop_together -p 127.0.0.1:54329:5432 postgres:17`

Right: `docker run -d --name shop-together-pg --network host -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop_together postgres:17 -c port=54329 -c listen_addresses=127.0.0.1`

After a machine restart the container is stopped, and the tests fail with `ECONNREFUSED 127.0.0.1:54329`. `docker start shop-together-pg` brings it back with its data and settings.
