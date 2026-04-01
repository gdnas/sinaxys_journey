import { useEffect, useState } from "react";
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
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const MM_TO_PX = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);
  const LABEL_SIZE_MM = 40; // 40 x 40 mm
  const DPI = 300;
  const SIZE_PX = MM_TO_PX(LABEL_SIZE_MM, DPI); // pixels for canvas

  // draw text centered with optional truncation
  const drawCenteredText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, fontWeight = '400') => {
    if (!text) return;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(truncated + (truncated.length < text.length ? '…' : ''), x, y);
  };

  // render the label into a canvas of given px size
  const renderLabelToCanvas = async (pxSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = pxSize;
    canvas.height = pxSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Styles and measurements based on pxSize
    const pad = Math.round(pxSize * 0.06);
    const usableWidth = pxSize - pad * 2;

    // Background + subtle rounded border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E6E7EA';
    ctx.lineWidth = Math.max(1, Math.round(pxSize * 0.004));
    // rounded rect
    const r = Math.round(pxSize * 0.02);
    ctx.beginPath();
    ctx.moveTo(r, 0.5);
    ctx.lineTo(canvas.width - r, 0.5);
    ctx.quadraticCurveTo(canvas.width - 0.5, 0.5, canvas.width - 0.5, r);
    ctx.lineTo(canvas.width - 0.5, canvas.height - r);
    ctx.quadraticCurveTo(canvas.width - 0.5, canvas.height - 0.5, canvas.width - r, canvas.height - 0.5);
    ctx.lineTo(r, canvas.height - 0.5);
    ctx.quadraticCurveTo(0.5, canvas.height - 0.5, 0.5, canvas.height - r);
    ctx.lineTo(0.5, r);
    ctx.quadraticCurveTo(0.5, 0.5, r, 0.5);
    ctx.closePath();
    ctx.stroke();

    // Compute font sizes
    const companyFontSize = Math.round(pxSize * 0.065);
    const codeFontSize = Math.round(pxSize * 0.15);
    const typeFontSize = Math.round(pxSize * 0.06);
    const modelFontSize = Math.round(pxSize * 0.05);
    const dateFontSize = Math.round(pxSize * 0.045);

    const gap = Math.round(pxSize * 0.02);

    let y = pad + companyFontSize; // baseline

    // Company (small, uppercase, muted)
    if (companyName) {
      ctx.fillStyle = '#0F172A';
      ctx.font = `600 ${companyFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      drawCenteredText(ctx, companyName.toUpperCase(), canvas.width / 2, y, usableWidth);
      y += companyFontSize + gap;
    }

    // Asset code (big)
    ctx.fillStyle = '#071133';
    ctx.font = `700 ${codeFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    // Ensure we don't draw code too tall; cap font if it would overflow
    const codeMetrics = ctx.measureText(assetCode);
    if (codeMetrics.width > usableWidth) {
      // reduce font until it fits
      let fs = codeFontSize;
      while (fs > 8) {
        ctx.font = `700 ${fs}px sans-serif`;
        if (ctx.measureText(assetCode).width <= usableWidth) break;
        fs -= 2;
      }
    }
    ctx.fillText(assetCode, canvas.width / 2, y);
    y += codeFontSize + Math.round(gap / 2);

    // Asset type (muted)
    ctx.fillStyle = '#334155';
    ctx.font = `500 ${typeFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    drawCenteredText(ctx, assetType, canvas.width / 2, y, usableWidth);
    y += typeFontSize + gap;

    // QR area - center a large square taking available space
    // Reserve footer space for model and date
    const footerReserve = model || brand || registeredAt ? Math.round(pxSize * 0.14) : Math.round(pxSize * 0.08);
    const availableForQr = canvas.height - y - pad - footerReserve;
    const qrSize = Math.max(64, Math.min(Math.round(pxSize * 0.6), availableForQr));
    const qrX = Math.round((canvas.width - qrSize) / 2);
    const qrY = y;

    // Generate QR onto temporary canvas at qrSize
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;
    try {
      const QRCodeLib = await import('qrcode');
      await (QRCodeLib as any).toCanvas(qrCanvas, qrCodeUrl, { errorCorrectionLevel: 'H', margin: 1, width: qrSize });
    } catch (e) {
      // fallback: draw empty box
      const qctx = qrCanvas.getContext('2d');
      if (qctx) {
        qctx.fillStyle = '#FFF';
        qctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        qctx.strokeStyle = '#E5E7EB';
        qctx.strokeRect(0, 0, qrCanvas.width, qrCanvas.height);
      }
    }

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Move y below QR
    y = qrY + qrSize + gap;

    // Model / brand (one line)
    const modelLabel = model ? `${brand || ''} ${model}`.trim() : brand || '';
    if (modelLabel) {
      ctx.fillStyle = '#334155';
      ctx.font = `500 ${modelFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      drawCenteredText(ctx, modelLabel, canvas.width / 2, y + Math.round(modelFontSize / 1.2), usableWidth);
      y += modelFontSize + gap;
    }

    // Registered date aligned to bottom
    if (registeredAt) {
      const dateLabel = `Registrado em: ${new Date(registeredAt).toLocaleDateString('pt-BR')}`;
      ctx.fillStyle = '#6B7280';
      ctx.font = `400 ${dateFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(dateLabel, canvas.width / 2, canvas.height - pad);
    }

    return canvas;
  };

  // preview generation using the same renderer but smaller px size
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const previewCanvas = await renderLabelToCanvas(520); // 520px preview gives crisp image in modal
        if (!mounted) return;
        setPreviewSrc(previewCanvas.toDataURL('image/png'));
      } catch (e) {
        console.error('preview render failed', e);
      }
    })();
    return () => { mounted = false; };
  }, [assetCode, assetType, qrCodeUrl, brand, model, companyName, registeredAt]);

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const canvas = await renderLabelToCanvas(SIZE_PX);
      const link = document.createElement('a');
      link.download = `etiqueta-${assetCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Erro ao gerar etiqueta:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta do Ativo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div style={{ width: 260, height: 260 }} className="bg-white p-2 border rounded-lg flex items-center justify-center">
              {previewSrc ? (
                // show generated preview image for accurate WYSIWYG
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={previewSrc} alt="Preview da etiqueta" className="max-w-full max-h-full" />
              ) : (
                // fallback to QR component briefly
                <QRCodeCanvas value={qrCodeUrl} size={180} level="H" includeMargin={true} />
              )}
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