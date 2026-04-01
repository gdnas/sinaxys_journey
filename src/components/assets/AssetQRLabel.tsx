import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AssetQRLabelProps {
  assetCode: string;
  assetType: string;
  qrCodeUrl: string;
  brand?: string | null;
  model?: string | null;
  companyName?: string | null;
  registeredAt?: string | null; // ISO date
  onClose?: () => void;
}

export default function AssetQRLabel({
  assetCode,
  assetType,
  qrCodeUrl,
  brand,
  model,
  companyName,
  registeredAt,
  onClose,
}: AssetQRLabelProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const MM_TO_PX = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);
  const LABEL_SIZE_MM = 40; // 40 x 40 mm
  const DPI = 300;
  const SIZE_PX = MM_TO_PX(LABEL_SIZE_MM, DPI); // pixels for canvas

  const handleDownloadImage = () => {
    setIsDownloading(true);
    // Render a canvas that matches 40x40mm at 300 DPI
    const canvas = document.createElement('canvas');
    canvas.width = SIZE_PX;
    canvas.height = SIZE_PX;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Padding (in px) inside the label
    const pad = Math.round(SIZE_PX * 0.06);

    // Company name (top) - small
    if (companyName) {
      ctx.fillStyle = '#111827';
      ctx.font = `${Math.round(SIZE_PX * 0.08)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(companyName, canvas.width / 2, pad + Math.round(SIZE_PX * 0.08));
    }

    // Asset code (bold)
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${Math.round(SIZE_PX * 0.13)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(assetCode, canvas.width / 2, Math.round(SIZE_PX * 0.13) + pad + (companyName ? Math.round(SIZE_PX * 0.06) : 0));

    // Asset type (small)
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.round(SIZE_PX * 0.07)}px sans-serif`;
    ctx.fillText(assetType, canvas.width / 2, Math.round(SIZE_PX * 0.13) + pad + Math.round(SIZE_PX * 0.13));

    // QR code - generate using qrcode library to data URL
    // We'll draw it as image in the center-right area
    const qrSize = Math.round(SIZE_PX * 0.46);
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;

    // Use QRCodeCanvas from qrcode.react to draw into a temporary canvas
    // Instead of mounting React component, draw with library 'qrcode' synchronously
    try {
      // Use dynamic import of 'qrcode' library
      // @ts-ignore
      const QRCodeLib = require('qrcode');
      QRCodeLib.toCanvas(qrCanvas, qrCodeUrl, { errorCorrectionLevel: 'H', margin: 1 }, function (err: any) {
        if (err) {
          console.error('Erro ao gerar QR:', err);
        }
        // Draw QR onto main canvas, centered horizontally
        const qrX = Math.round((canvas.width - qrSize) / 2);
        const qrY = Math.round(canvas.height * 0.38);
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

        // Registered at (bottom)
        if (registeredAt) {
          ctx.fillStyle = '#6B7280';
          ctx.font = `${Math.round(SIZE_PX * 0.06)}px sans-serif`;
          ctx.textAlign = 'center';
          const dateLabel = `Registrado em: ${new Date(registeredAt).toLocaleDateString('pt-BR')}`;
          ctx.fillText(dateLabel, canvas.width / 2, canvas.height - pad);
        }

        // Asset details small under QR
        const modelLabel = model ? `${brand || ''} ${model}`.trim() : brand || '';
        if (modelLabel) {
          ctx.fillStyle = '#374151';
          ctx.font = `${Math.round(SIZE_PX * 0.06)}px sans-serif`;
          ctx.fillText(modelLabel, canvas.width / 2, Math.round(canvas.height * 0.36));
        }

        const link = document.createElement('a');
        link.download = `etiqueta-${assetCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsDownloading(false);
      });
    } catch (e) {
      console.error('Erro ao gerar QR (lib):', e);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta do Ativo</DialogTitle>
        </DialogHeader>

        {/* Visual preview simples */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div style={{ width: 240, height: 240 }} className="bg-white p-4 border rounded-lg flex flex-col items-center justify-center">
              <QRCodeCanvas value={qrCodeUrl} size={160} level="H" includeMargin={true} />
              <div className="text-center mt-3 text-sm">
                <div className="font-bold">{companyName}</div>
                <div className="text-xs">{assetCode} — {assetType}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
              onClick={handleDownloadImage}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Gerando...' : 'Baixar Etiqueta 40×40mm'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => onClose?.()}>
              Fechar
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}