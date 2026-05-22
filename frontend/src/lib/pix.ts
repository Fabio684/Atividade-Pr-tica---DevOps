function pixField(id: string, value: string): string {
  const size = String(value.length).padStart(2, "0");
  return `${id}${size}${value}`;
}

export function generateRandomPixKey(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "TX";
  for (let index = 0; index < 23; index += 1) {
    key += charset[Math.floor(Math.random() * charset.length)];
  }
  return key;
}

function sanitizePixText(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function crc16(payload: string): string {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(input: {
  phoneKey: string;
  txid: string;
  amount: string;
  description: string;
}): string {
  const merchantName = sanitizePixText("FAVORITES HUB", 25);
  const merchantCity = sanitizePixText("FORTALEZA", 15);
  const description = sanitizePixText(input.description || "PAGAMENTO", 40);

  let merchantAccount = "";
  merchantAccount += pixField("00", "br.gov.bcb.pix");
  merchantAccount += pixField("01", input.phoneKey);
  if (description) {
    merchantAccount += pixField("02", description);
  }

  let payload = "";
  payload += pixField("00", "01");
  payload += pixField("26", merchantAccount);
  payload += pixField("52", "0000");
  payload += pixField("53", "986");
  payload += pixField("54", input.amount);
  payload += pixField("58", "BR");
  payload += pixField("59", merchantName);
  payload += pixField("60", merchantCity);
  payload += pixField("62", pixField("05", input.txid));
  payload += "6304";
  payload += crc16(payload);

  return payload;
}