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
  onClose?: () => void;
}

export default function AssetQRLabel({
  assetCode,
  assetType,
  qrCodeUrl,
  brand,
  model,
  onClose,
}: AssetQRLabelProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownloadImage = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `etiqueta-${assetCode}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta do Ativo</DialogTitle>
        </DialogHeader>

        {/* Etiqueta para impressão */}
        <div className="space-y-4">
          {/* Visualização da etiqueta */}
          <div
            id="asset-label"
            className="bg-white border-2 border-gray-300 rounded-xl p-6 space-y-4"
          >
            {/* Header da etiqueta */}
            <div className="border-b-2 border-gray-800 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Patrimônio da Empresa
              </p>
            </div>

            {/* Código do ativo */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">{assetCode}</h2>
              <p className="text-sm text-gray-600 mt-1">{assetType}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={qrCodeUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="space-y-2 text-sm">
              {brand && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Marca:</span>
                  <span className="font-medium text-gray-900">{brand}</span>
                </div>
              )}
              {model && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Modelo:</span>
                  <span className="font-medium text-gray-900">{model}</span>
                </div>
              )}
            </div>

            {/* Instrução */}
            <div className="text-center text-xs text-gray-500 pt-2">
              Escaneie para ver informações do ativo
            </div>
          </div>

          {/* URL para referência */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">URL do QR Code:</p>
            <p className="text-xs text-gray-700 break-all font-mono">
              {qrCodeUrl}
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
              onClick={handleDownloadImage}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Etiqueta
            </Button>
          </div>
        </div>

        {/* Estilos para impressão */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #asset-label,
            #asset-label * {
              visibility: visible;
            }
            #asset-label {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: 400px;
              margin: 20px;
              border: 2px solid #000;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}