import { Alert } from 'react-native';

export const savePass = async ({ qrSvgRef, username }) => {
    if (!qrSvgRef.current) {
        Alert.alert("Error", "QR code is not ready yet.");
        return;
    }

    // Web-specific Canvas Compositor
    qrSvgRef.current.toDataURL(async (dataURL) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');

            // 1. Draw premium solid white background card
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Glowing Black and Turquoise double theme borders
            ctx.strokeStyle = '#111827'; // Black outer border
            ctx.lineWidth = 10;
            ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

            ctx.strokeStyle = '#40E0D0'; // Turquoise inner border
            ctx.lineWidth = 8;
            ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

            // 2. Draw Text "Let's be Chowmates" and "in lamon.go"
            ctx.fillStyle = '#111827'; // Dark Slate
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.font = '900 42px system-ui, -apple-system, sans-serif';
            ctx.fillText("Let's be Chowmates", canvas.width / 2, 130);
            
            ctx.font = '800 28px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#0D9488'; // Brand Teal
            ctx.fillText("in lamon.go", canvas.width / 2, 190);

            // 3. Draw the QR code image with rounded subtle card border container
            const qrImage = new Image();
            qrImage.onload = () => {
                const qrSize = 440;
                const qrX = (canvas.width - qrSize) / 2;
                const qrY = 260;

                // Draw premium subtle outline container around QR
                ctx.strokeStyle = '#E5E7EB';
                ctx.lineWidth = 4;
                const cardPadding = 32;
                const rx = qrX - cardPadding;
                const ry = qrY - cardPadding;
                const rw = qrSize + cardPadding * 2;
                const rh = qrSize + cardPadding * 2;
                const radius = 32;
                
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(rx, ry, rw, rh, radius);
                } else {
                    ctx.rect(rx, ry, rw, rh);
                }
                ctx.stroke();

                // Draw QR Image (base QR code without the logo)
                ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

                // 3b. Programmatically draw the central Gourmet Smile logo image
                const logoImg = new Image();
                
                const finalizeCardExport = () => {
                    // 4. Draw @username
                    ctx.fillStyle = '#111827';
                    ctx.font = '900 46px system-ui, -apple-system, sans-serif';
                    ctx.fillText(`@${username || 'Guest'}`, canvas.width / 2, 850);

                    // Footer scan hint
                    ctx.fillStyle = '#6B7280';
                    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
                    ctx.fillText("Scan to connect instantly", canvas.width / 2, 915);

                    // Trigger download
                    const element = document.createElement("a");
                    element.href = canvas.toDataURL("image/png");
                    element.download = `lamon-go-chowmate-pass-${username || 'user'}.png`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                };

                logoImg.onload = () => {
                    const logoSize = 88; // Exactly matching proportional size (20% of 440px QR code)
                    const logoX = qrX + (qrSize - logoSize) / 2;
                    const logoY = qrY + (qrSize - logoSize) / 2;

                    // Draw solid white rounded box behind the logo to cover the QR center cleanly
                    ctx.fillStyle = '#FFFFFF';
                    const logoPadding = 8;
                    const lrx = logoX - logoPadding;
                    const lry = logoY - logoPadding;
                    const lrw = logoSize + logoPadding * 2;
                    const lrh = logoSize + logoPadding * 2;
                    const lradius = 12;

                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(lrx, lry, lrw, lrh, lradius);
                    } else {
                        ctx.rect(lrx, lry, lrw, lrh);
                    }
                    ctx.fill();

                    // Draw the Gourmet Smile logo image
                    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                    
                    // Finalize and download
                    finalizeCardExport();
                };

                logoImg.onerror = () => {
                    console.error("Gourmet Smile logo failed to load during Web canvas export.");
                    finalizeCardExport();
                };

                // Resolve cross-platform asset path correctly
                let logoSrc = require('../assets/images/favicon_suggestion.png');
                if (logoSrc && typeof logoSrc === 'object' && logoSrc.uri) {
                    logoSrc = logoSrc.uri;
                } else if (logoSrc && logoSrc.default) {
                    logoSrc = logoSrc.default;
                }
                logoImg.src = logoSrc;
            };

            qrImage.onerror = () => {
                console.error("QR Code SVG Image failed to deserialize.");
                Alert.alert("Error", "Failed to compile the QR Code Pass.");
            };

            qrImage.src = `data:image/png;base64,${dataURL}`;
        } catch (error) {
            console.error("Failed to save Web QR Code", error);
            Alert.alert("Error", "Failed to save the QR Code Pass.");
        }
    });
};
