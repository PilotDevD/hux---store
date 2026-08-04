// Pix "BR Code" (EMV®) generator — produces the copia-e-cola payload for a
// static Pix charge with amount. Includes CRC16-CCITT (0xFFFF) as required.
// This is a real, valid BR Code; when a payment gateway is later plugged in,
// swap this for the gateway's dynamic charge.

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove accents + uppercase, per BR Code recommendations for name/city. */
function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export function buildPixPayload(opts: {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid?: string;
}): string {
  const { key, merchantName, merchantCity, amountCents } = opts;
  const txid = (opts.txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  // Merchant Account Information (26) — GUI + Pix key
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyField = tlv("01", key);
  const mai = tlv("26", gui + keyField);

  const amount = (amountCents / 100).toFixed(2);

  let payload =
    tlv("00", "01") + // payload format indicator
    tlv("01", "12") + // point of initiation: 12 = reusable (static)
    mai +
    tlv("52", "0000") + // merchant category code
    tlv("53", "986") + // currency BRL
    tlv("54", amount) +
    tlv("58", "BR") +
    tlv("59", sanitize(merchantName, 25) || "HUX RUN") +
    tlv("60", sanitize(merchantCity, 15) || "SAO PAULO") +
    tlv("62", tlv("05", txid));

  payload += "6304"; // CRC id + length
  return payload + crc16(payload);
}
