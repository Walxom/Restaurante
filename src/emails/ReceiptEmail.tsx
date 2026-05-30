import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface ReceiptEmailProps {
  customerName: string;
  invoiceNumber: string;
  invoiceType: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  igv: number;
  total: number;
}

export const ReceiptEmail = ({
  customerName = "Cliente",
  invoiceNumber = "B001-00000001",
  invoiceType = "BOLETA",
  date = new Date().toLocaleDateString("es-PE"),
  items = [],
  subtotal = 0,
  igv = 0,
  total = 0,
}: ReceiptEmailProps) => (
  <Html>
    <Head />
    <Preview>Tu comprobante electrónico de Bendistaurante</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={heading}>Bendistaurante</Heading>
          <Text style={headerText}>¡Gracias por tu preferencia!</Text>
        </Section>
        
        <Section style={bodySection}>
          <Heading as="h2" style={title}>
            {invoiceType === "FACTURA" ? "Factura Electrónica" : "Boleta de Venta Electrónica"}
          </Heading>
          
          <Text style={text}>Hola <strong>{customerName}</strong>,</Text>
          <Text style={text}>
            Adjuntamos el detalle de tu consumo correspondiente al comprobante <strong>{invoiceNumber}</strong> 
            emitido el {date}.
          </Text>

          <Hr style={hr} />

          <Section>
            <Row style={tableHeader}>
              <Column style={{ width: "10%" }}>Cant.</Column>
              <Column style={{ width: "50%" }}>Descripción</Column>
              <Column style={{ width: "20%" }}>P. Unit</Column>
              <Column style={{ width: "20%" }}>Total</Column>
            </Row>
            {items.map((item, index) => (
              <Row key={index} style={tableRow}>
                <Column>{item.quantity}</Column>
                <Column>{item.description}</Column>
                <Column>S/ {item.unitPrice.toFixed(2)}</Column>
                <Column>S/ {item.total.toFixed(2)}</Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={totalsSection}>
            <Row>
              <Column style={totalLabel}>Subtotal:</Column>
              <Column style={totalValue}>S/ {subtotal.toFixed(2)}</Column>
            </Row>
            <Row>
              <Column style={totalLabel}>IGV (18%):</Column>
              <Column style={totalValue}>S/ {igv.toFixed(2)}</Column>
            </Row>
            <Row>
              <Column style={grandTotalLabel}>Total a Pagar:</Column>
              <Column style={grandTotalValue}>S/ {total.toFixed(2)}</Column>
            </Row>
          </Section>

          <Text style={footerText}>
            Este es un comprobante electrónico válido. Si tienes alguna duda sobre este cargo,
            por favor contáctanos respondiendo a este correo.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerCopyright}>
            © {new Date().getFullYear()} Bendistaurante. Todos los derechos reservados.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const header = {
  backgroundColor: "#1e293b",
  padding: "32px",
  textAlign: "center" as const,
};

const heading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};

const headerText = {
  color: "#94a3b8",
  fontSize: "14px",
  marginTop: "8px",
};

const bodySection = {
  padding: "32px",
};

const title = {
  fontSize: "20px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#334155",
};

const text = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const tableHeader = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  paddingBottom: "8px",
  borderBottom: "1px solid #e2e8f0",
};

const tableRow = {
  color: "#334155",
  fontSize: "14px",
  padding: "12px 0",
  borderBottom: "1px solid #f1f5f9",
};

const totalsSection = {
  marginTop: "24px",
  width: "250px",
  marginLeft: "auto",
};

const totalLabel = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "right" as const,
  paddingRight: "16px",
  paddingBottom: "8px",
};

const totalValue = {
  color: "#334155",
  fontSize: "14px",
  fontWeight: "bold",
  textAlign: "right" as const,
  paddingBottom: "8px",
};

const grandTotalLabel = {
  ...totalLabel,
  color: "#0f172a",
  fontWeight: "bold",
  fontSize: "16px",
  paddingTop: "8px",
  borderTop: "1px solid #e2e8f0",
};

const grandTotalValue = {
  ...totalValue,
  color: "#10b981",
  fontSize: "18px",
  paddingTop: "8px",
  borderTop: "1px solid #e2e8f0",
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "32px",
  textAlign: "center" as const,
};

const footer = {
  padding: "0 32px",
};

const footerCopyright = {
  color: "#94a3b8",
  fontSize: "12px",
  textAlign: "center" as const,
};

export default ReceiptEmail;
