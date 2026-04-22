export function buildPreviewHtml(rawHtml) {
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            font-family: Arial, sans-serif;
            background: #f8fafc;
          }

          .preview-shell {
            box-sizing: border-box;
            width: 100%;
            min-height: 100vh;
            padding: 32px 24px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }

          .preview-card {
            width: 100%;
            max-width: 720px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
          }
        </style>
      </head>
      <body>
        <div class="preview-shell">
          <div class="preview-card">
            ${rawHtml || ""}
          </div>
        </div>
      </body>
    </html>
  `;
}