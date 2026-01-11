FROM redis:alpine

COPY ./entrypoint.sh .

COPY ./ca.crt /usr/local/share/ca.crt

RUN chmod +x ./entrypoint.sh && apk add --update --no-cache curl jq

CMD [ "./entrypoint.sh" ]