FROM alpine:3.20
RUN apk add --no-cache tor
COPY torrc /etc/tor/torrc
RUN mkdir -p /var/lib/tor/rastro && chown -R tor /var/lib/tor && chmod 700 /var/lib/tor/rastro
USER tor
ENTRYPOINT ["tor", "-f", "/etc/tor/torrc"]
