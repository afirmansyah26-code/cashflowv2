# ZimaOS Production Deployment Guide

This guide describes how to deploy the Cashflow application on ZimaOS for long-term production use. The application is packaged as a completely stateless Docker container.

## Security & Permissions (CRITICAL)

The application runs inside the container as a non-root user (`uid 1001`). To ensure the container can read and write to the persistent storage securely without resorting to insecure permissions:

**NEVER run `chmod 777`.**

Instead, before starting the application, prepare your local `storage/` directory and set the exact ownership matching the container:

```bash
mkdir -p ./storage
chown -R 1001:1001 ./storage
chmod -R 755 ./storage
```

## Folder Layout

The application relies strictly on the following volume mounts:
- `./.env`: The environment configuration.
- `./storage`: Persistent uploads and assets.

```
/your/zimaos/path/cashflow-next/
├── docker-compose.yml
├── .env                  <-- Application configuration
└── storage/              <-- Persistent storage
    ├── private/          <-- Private uploads (bukti, attachments, documents)
    └── public/           <-- Public uploads (kop-surat, assets)
```

No data is written to the `.next` or `public` folders at runtime.

## Installation / First Deployment

1. Set up the target folder on ZimaOS and create the `storage` directory.
2. Apply the permissions: `sudo chown -R 1001:1001 ./storage && sudo chmod -R 755 ./storage`.
3. Create your `.env` file based on `.env.production.example`. 
   > **Note on HTTPS:** Set `COOKIE_SECURE=false` for standard HTTP deployment. If you later expose this through a Cloudflare Tunnel or an SSL Reverse Proxy, simply change this to `COOKIE_SECURE=true` and restart. No source code changes are required.
4. Build and run the container:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Updating Application

Since this is a source-based deployment (no Git/CI), follow these steps to update:

1. Stop the application:
   ```bash
   docker-compose down
   ```
2. Replace the project source files with the new release version.
3. Rebuild the image from scratch to ensure a clean slate:
   ```bash
   docker-compose build --no-cache
   ```
4. Start the updated application:
   ```bash
   docker-compose up -d
   ```
*Database migrations run automatically during startup.*

## Backup

To safely backup your application, you only need to backup three things:

1. **Database**: Use `mysqldump` to back up your external MySQL instance.
2. **Storage**: Archive the local `./storage` folder.
   ```bash
   tar -czvf cashflow-storage-backup-$(date +%F).tar.gz ./storage
   ```
3. **Configuration**: Backup your `.env` file.

## Restore / Disaster Recovery

Because the container is stateless, disaster recovery is simple:
1. Re-deploy the source code and rebuild the image.
2. Restore your `storage/` directory and ensure ownership is `1001:1001`.
3. Restore your MySQL database from the SQL dump.
4. Run `docker-compose up -d`.

## Rollback

To rollback a failed update:
1. Stop the container (`docker compose down`).
2. Revert the source code to the previous version.
3. Rebuild (`docker compose build --no-cache`).
4. Restore your database backup (if the failed update ran schema migrations).
5. Start the container (`docker compose up -d`).

## Legacy Uploads Migration Notes

Older versions of this application wrote logos to `public/uploads` inside the container. 
**No automatic migration script is provided** for safety reasons. If you need to migrate old logos:
1. Locate your old logos.
2. Manually copy them to `./storage/public/kop-surat/` on your host machine.
Existing URLs in the database will seamlessly route to the new storage paths securely.

## Troubleshooting

- **Database Connection Error**: The container will wait up to 60 seconds for the database. Ensure your `.env` `DATABASE_URL` is correct.
- **Permission Denied for Uploads**: You missed the `chown 1001:1001` step. Fix the host folder ownership and restart the container.
