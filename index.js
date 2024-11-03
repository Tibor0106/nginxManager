const express = require("express");

const bodyParser = require("body-parser");

const fs = require("fs");

const { exec } = require("child_process");
var cors = require("cors");

const app = express();

const port = 3111;

class Server {
  constructor(host, server) {
    this.host = host;

    this.server = server;
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route to add a new host configuration

app.post("/add-host", (req, res) => {
  const { serverName, destination } = req.body;

  const config = `
server {
    listen 443 ssl;
    server_name ${serverName};
    ssl_certificate /etc/letsencrypt/live/paraghtibor.hu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/paraghtibor.hu/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass ${destination};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ /\.ht {
        deny all;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

`;

  const filePath = `/etc/nginx/sites-available/${serverName.split(".")[0]}`;

  fs.writeFile(filePath, config, (err) => {
    if (err) {
      console.error("Failed to write configuration:", err);
      return res.status(500).json({ error: "Failed to write configuration" });
    }
    exec(
      `sudo ln -s ${filePath} /etc/nginx/sites-enabled/${
        serverName.split(".")[0]
      }`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Failed to create symbolic link:", error);
          return res
            .status(500)
            .json({ error: "Failed to create symbolic link" });
        }
        exec("sudo systemctl reload nginx", (error, stdout, stderr) => {
          if (error) {
            console.error("Failed to reload Nginx:", error);
            return res.status(500).json({ error: "Failed to reload Nginx" });
          }

          return res
            .status(200)
            .json({ message: "Host added and Nginx reloaded successfully" });
        });
      }
    );
  });
});

app.post("/remove-host", (req, res) => {
  const { serverName } = req.body;

  if (!serverName) {
    return res.status(400).json({ error: "serverName is required" });
  }
  exec(
    `sudo rm /etc/nginx/sites-enabled/${serverName.split(".")[0]}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error("Failed to reload Nginx:", error);
        return res.status(500).json({ error: "Failed to reload Nginx" });
      }

      exec(
        `sudo rm /etc/nginx/sites-available/${serverName.split(".")[0]}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Failed to reload Nginx:", error);
            return res.status(500).json({ error: "Failed to reload Nginx" });
          }
          exec("sudo systemctl reload nginx", (error, stdout, stderr) => {
            if (error) {
              console.error("Failed to reload Nginx:", error);
              return res.status(500).json({ error: "Failed to reload Nginx" });
            }
          });
          return res
            .status(200)
            .json({ message: "Host added and Nginx reloaded successfully" });
        }
      );
    }
  );
});

// Start the server

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
