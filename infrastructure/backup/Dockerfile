FROM postgres:17-alpine@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193
COPY backup-loop.sh /usr/local/bin/backup-loop
RUN apk upgrade --no-cache \
    && apk add --no-cache aws-cli \
    && rm -f /usr/local/bin/gosu \
    && chmod 0555 /usr/local/bin/backup-loop \
    && mkdir -p /work \
    && chown postgres:postgres /work
USER postgres
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/backup-loop"]
