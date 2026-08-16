import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  CollapsibleSection,
  Divider,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type SectionId =
  | "overview"
  | "prep"
  | "config"
  | "runtime"
  | "proxy"
  | "verify"
  | "ops";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "prep", label: "Prep" },
  { id: "config", label: "Config" },
  { id: "runtime", label: "Runtime" },
  { id: "proxy", label: "Proxy" },
  { id: "verify", label: "Verify" },
  { id: "ops", label: "Ops" },
];

function Pre({ children }: { children: string }) {
  const theme = useHostTheme();
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        overflow: "auto",
        fontSize: 12,
        lineHeight: 1.45,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        background: theme.fill.tertiary,
        color: theme.text.primary,
        borderRadius: 6,
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </pre>
  );
}

function Bullet({ children }: { children: Parameters<typeof Text>[0]["children"] }) {
  return (
    <Text size="small" tone="secondary">
      {children}
    </Text>
  );
}

function Overview() {
  return (
    <Stack gap={16}>
      <Text>
        Deploy OpenSooq Sentry directly on a Linux server without containers.
        The NestJS API runs under systemd on loopback; Nginx or Apache serves
        the built React app and proxies <Code>/api</Code>.
      </Text>

      <Callout tone="danger" title="No built-in authentication">
        Access must be protected at the reverse proxy with both an IP allowlist
        and HTTP Basic Authentication over HTTPS. Anyone who passes those
        controls can use every application action, including ELK, Jira, release
        synchronization, and an enabled raw-document viewer.
      </Callout>

      <Row gap={24} wrap>
        <Stat value="127.0.0.1:3100" label="API bind" />
        <Stat value="≤30 days" label="Evidence retention" />
      </Row>

      <H3>Architecture</H3>
      <Table
        headers={["Layer", "Role", "Notes"]}
        rows={[
          [
            "Browser",
            "HTTPS → reverse proxy",
            "IP allowlist + Basic Auth required",
          ],
          [
            "Nginx / Apache",
            "Static web + /api proxy",
            "Sets X-Remote-User from Basic Auth",
          ],
          [
            "systemd service",
            "NestJS API",
            "Loopback only; never expose 3100",
          ],
          [
            "SQLite",
            "Authoritative source registry + evidence",
            "Absolute path under /var/lib/opensooq-sentry",
          ],
        ]}
        striped
      />

      <H3>Deployment path</H3>
      <Table
        headers={["Step", "Action"]}
        rows={[
          ["1", "Install packages (Node 20+, build tools, sqlite3, Nginx/Apache)"],
          ["2", "Create opensooq-sentry system user and directories"],
          ["3", "Clone a tested commit; npm ci / test / typecheck / build"],
          ["4", "Write /opt/opensooq-sentry/.env (secrets + overrides only)"],
          ["5", "Install and start opensooq-sentry.service"],
          ["6–7", "Configure Nginx or Apache (not both)"],
          ["8", "Verify auth, bind, dashboard, and integrations"],
          ["9–11", "Back up SQLite; update / rollback procedures"],
        ]}
        columnAlign={["left", "left"]}
      />
    </Stack>
  );
}

function Prep() {
  return (
    <Stack gap={16}>
      <H3>Server requirements</H3>
      <Table
        headers={["Requirement", "Detail"]}
        rows={[
          ["OS", "Supported Linux (e.g. Ubuntu 24.04)"],
          ["Runtime", "Node.js 20+ and npm (org-approved repo, not distro Node)"],
          ["Tools", "Git, native build tools for better-sqlite3, sqlite3 CLI"],
          ["Proxy", "Nginx or Apache"],
          ["Network", "Outbound to ELK, Atlassian, and GitLab"],
        ]}
        striped
      />

      <Card>
        <CardHeader>Example Ubuntu packages</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo apt update
sudo apt install -y git build-essential python3 sqlite3 nginx apache2-utils
node --version
npm --version`}</Pre>
        </CardBody>
      </Card>

      <H3>Service account and directories</H3>
      <Card>
        <CardHeader>Create user and paths</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo useradd \\
  --system \\
  --home /var/lib/opensooq-sentry \\
  --create-home \\
  --shell /usr/sbin/nologin \\
  opensooq-sentry

sudo install -d -o opensooq-sentry -g opensooq-sentry -m 0750 \\
  /var/lib/opensooq-sentry
sudo install -d -o root -g root -m 0755 /opt/opensooq-sentry
sudo install -d -o opensooq-sentry -g opensooq-sentry -m 0750 \\
  /var/backups/opensooq-sentry`}</Pre>
        </CardBody>
      </Card>

      <Callout tone="warning" title="Keep production data out of Git">
        The SQLite database must use an absolute path under{" "}
        <Code>/var/lib/opensooq-sentry</Code>. Do not keep production data
        inside the Git checkout.
      </Callout>

      <H3>Install a tested revision</H3>
      <Text size="small" tone="secondary">
        Deploy only a reviewed commit; do not deploy a dirty working tree. Do
        not run the Vite development server or <Code>nest start --watch</Code>{" "}
        in production.
      </Text>
      <Card>
        <CardHeader>Clone, verify, build</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo git clone <repository-url> /opt/opensooq-sentry
cd /opt/opensooq-sentry
sudo git checkout <tested-commit>
sudo npm ci
sudo npm test
sudo npm run typecheck
sudo npm run build

sudo chown -R root:root /opt/opensooq-sentry
sudo find /opt/opensooq-sentry -type d -exec chmod 0755 {} \\;
sudo find /opt/opensooq-sentry -type f -exec chmod 0644 {} \\;`}</Pre>
        </CardBody>
      </Card>
    </Stack>
  );
}

function Config() {
  return (
    <Stack gap={16}>
      <Text>
        Create <Code>/opt/opensooq-sentry/.env</Code> with secrets and
        deployment-specific overrides only. Values that already match
        application defaults do not need to be repeated.
      </Text>

      <Card>
        <CardHeader>/opt/opensooq-sentry/.env</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`# Required deployment paths and external browser origin
DATABASE_PATH=/var/lib/opensooq-sentry/os-sentry.sqlite
WEB_ORIGIN=https://sentry.internal.example

# Recommended override for the current ELK cardinality
LOG_MAX_GROUPS_PER_SOURCE=10000

# Approved for the IP-restricted, HTTP-authenticated internal deployment
RAW_ELK_VIEW_ENABLED=true
HTTPD_CORRELATION_ENABLED=true
REQUEST_TIMELINE_ENABLED=true
AUDIT_TRUST_PROXY_USER=true

# Server-only credentials
GITLAB_API_TOKEN=<server-only-token>
JIRA_EMAIL=<service-account-email>
JIRA_API_TOKEN=<server-only-token>`}</Pre>
        </CardBody>
      </Card>

      <H3>Required and sensitive settings</H3>
      <Table
        headers={["Setting", "Guidance"]}
        rows={[
          [
            "DATABASE_PATH",
            "Absolute path so systemd and admin commands share one DB",
          ],
          [
            "WEB_ORIGIN",
            "Exact external HTTPS browser origin, no extra path",
          ],
          [
            "JIRA_EMAIL / JIRA_API_TOKEN",
            "Required for Jira mutations and Confluence release sync",
          ],
          [
            "GITLAB_API_TOKEN",
            "May start empty; snippets, line history, tags, Git evidence stay unavailable until set",
          ],
          [
            "HTTP Basic Auth",
            "Managed only in the Nginx/Apache password file — never in app .env",
          ],
        ]}
        striped
      />

      <H3>Feature flags (approved behind proxy controls)</H3>
      <Table
        headers={["Flag", "Effect"]}
        rows={[
          [
            "RAW_ELK_VIEW_ENABLED",
            "Raw documents uncached and never persisted; only behind IP + HTTPS + Basic Auth",
          ],
          [
            "HTTPD_CORRELATION_ENABLED",
            "Explicit per-sample Arachna request lookup by exact UUID/tracking IDs",
          ],
          [
            "REQUEST_TIMELINE_ENABLED",
            "Bounded exact-ID queries across sources + Arachna HTTPD; events uncached",
          ],
          [
            "AUDIT_TRUST_PROXY_USER",
            "Records Basic Auth username from proxy; enable only with loopback API + overwritten header",
          ],
        ]}
        striped
      />

      <CollapsibleSection
        title="Bootstrap-only source defaults"
        count={6}
        defaultOpen={false}
      >
        <Stack gap={10}>
          <Text size="small" tone="secondary">
            Fresh SQLite imports these when creating Arachna, Payment Warehouse,
            and Arbok v2 sources. After first successful startup, the SQLite
            source registry is authoritative — changing env values does not
            overwrite Sources-page edits.
          </Text>
          <Table
            headers={["Kind", "Default"]}
            rows={[
              ["Arachna ELK ID", "7745c6b0-6c49-11f1-b974-67aba06e6c67"],
              ["Payment Warehouse ELK ID", "021ae830-6d38-11f1-b974-67aba06e6c67"],
              ["Arbok v2 ELK ID", "e59a8540-8b36-11f1-b974-67aba06e6c67"],
              ["GitLab Arachna", "opensooq-arachna/arachna"],
              ["GitLab Payment", "opensooq-payment/payment-warehouse"],
              ["GitLab Arbok", "opensooq-arbokv2/arbokV2"],
            ]}
            framed={false}
          />
          <Bullet>
            <Code>ELK_ARACHNA_HTTPD_ACCESS_INDEX_PATTERN_ID</Code> is read at
            request time when HTTPD correlation is enabled; omit unless that
            saved object changes.
          </Bullet>
        </Stack>
      </CollapsibleSection>

      <CollapsibleSection title="Optional overrides and retention" defaultOpen={false}>
        <Stack gap={8}>
          <Bullet>
            All other settings use <Code>.env.example</Code> defaults. Add a
            setting only when production intentionally differs.
          </Bullet>
          <Bullet>
            Omit <Code>LOG_AUTO_REFRESH_ENABLED</Code> (default true → ELK every
            300s). Set false only for manual Sync ELK exclusively.
          </Bullet>
          <Bullet>
            App enforces <Code>DATA_RETENTION_DAYS &lt;= 30</Code>. Hourly pruning
            runs even when scheduled ELK sync is disabled.
          </Bullet>
          <Bullet>
            Error-rate collection needs an enabled traffic profile per source;
            no extra deployment secret. Alert Rules are in-app only.
          </Bullet>
        </Stack>
      </CollapsibleSection>

      <Card>
        <CardHeader>Protect the environment file</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo chown root:opensooq-sentry /opt/opensooq-sentry/.env
sudo chmod 0640 /opt/opensooq-sentry/.env`}</Pre>
        </CardBody>
      </Card>
      <Callout tone="warning" title="Never commit secrets">
        Never put HTTP Basic Auth passwords, API tokens, or <Code>.env</Code> in
        Git.
      </Callout>
    </Stack>
  );
}

function Runtime() {
  return (
    <Stack gap={16}>
      <Text>
        Create <Code>/etc/systemd/system/opensooq-sentry.service</Code>. Confirm
        the Node path with <Code>command -v node</Code> and update{" "}
        <Code>ExecStart</Code> when necessary.
      </Text>

      <Card>
        <CardHeader>opensooq-sentry.service</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`[Unit]
Description=OpenSooq Sentry API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=opensooq-sentry
Group=opensooq-sentry
WorkingDirectory=/opt/opensooq-sentry
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/opensooq-sentry/apps/api/dist/main.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0027

NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/opensooq-sentry

[Install]
WantedBy=multi-user.target`}</Pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Enable and start</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo systemctl daemon-reload
sudo systemctl enable --now opensooq-sentry
sudo systemctl status opensooq-sentry
sudo journalctl -u opensooq-sentry -n 100 --no-pager`}</Pre>
        </CardBody>
      </Card>

      <Callout tone="danger" title="Loopback only">
        The API intentionally binds only to <Code>127.0.0.1:3100</Code>. Do not
        expose that port through the firewall.
      </Callout>
    </Stack>
  );
}

function Proxy() {
  const [proxy, setProxy] = useCanvasState<"nginx" | "apache">("proxy", "nginx");

  return (
    <Stack gap={16}>
      <Text>
        Use either Nginx or Apache, not both. Both require TLS, an IP
        allowlist, HTTP Basic Auth, and <Code>X-Remote-User</Code> for audit
        attribution. Create a distinct Basic Auth username per operator.
      </Text>

      <Row gap={8} wrap>
        <Pill active={proxy === "nginx"} onClick={() => setProxy("nginx")}>
          Nginx
        </Pill>
        <Pill active={proxy === "apache"} onClick={() => setProxy("apache")}>
          Apache
        </Pill>
      </Row>

      {proxy === "nginx" ? (
        <Stack gap={12}>
          <Card>
            <CardHeader>Basic Auth password file</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`sudo htpasswd -c /etc/nginx/opensooq-sentry.htpasswd sentry-admin
sudo chown root:www-data /etc/nginx/opensooq-sentry.htpasswd
sudo chmod 0640 /etc/nginx/opensooq-sentry.htpasswd`}</Pre>
            </CardBody>
          </Card>
          <Text size="small" tone="secondary">
            Add later users without <Code>-c</Code>; never share one common
            username.
          </Text>
          <Card>
            <CardHeader>/etc/nginx/sites-available/opensooq-sentry</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`server {
    listen 443 ssl http2;
    server_name sentry.internal.example;

    ssl_certificate     /etc/ssl/certs/sentry.internal.example.crt;
    ssl_certificate_key /etc/ssl/private/sentry.internal.example.key;

    satisfy all;
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    deny all;

    auth_basic "OpenSooq Sentry";
    auth_basic_user_file /etc/nginx/opensooq-sentry.htpasswd;

    root /opt/opensooq-sentry/apps/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Remote-User $remote_user;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 1m;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`}</Pre>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Enable site</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`sudo ln -s /etc/nginx/sites-available/opensooq-sentry \\
  /etc/nginx/sites-enabled/opensooq-sentry
sudo nginx -t
sudo systemctl reload nginx`}</Pre>
            </CardBody>
          </Card>
          <Callout tone="info" title="Trusted load balancer">
            If another trusted load balancer terminates TLS, configure its
            trusted source address explicitly. Do not trust arbitrary{" "}
            <Code>X-Forwarded-For</Code> headers for the IP allowlist.
          </Callout>
        </Stack>
      ) : (
        <Stack gap={12}>
          <Card>
            <CardHeader>Modules and password file</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`sudo a2enmod ssl proxy proxy_http headers auth_basic authn_file
sudo htpasswd -c /etc/apache2/opensooq-sentry.htpasswd sentry-admin
sudo chown root:www-data /etc/apache2/opensooq-sentry.htpasswd
sudo chmod 0640 /etc/apache2/opensooq-sentry.htpasswd`}</Pre>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Virtual host example</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`<VirtualHost *:443>
    ServerName sentry.internal.example
    DocumentRoot /opt/opensooq-sentry/apps/web/dist

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/sentry.internal.example.crt
    SSLCertificateKeyFile /etc/ssl/private/sentry.internal.example.key

    <Directory /opt/opensooq-sentry/apps/web/dist>
        Options -Indexes
        AllowOverride None
        FallbackResource /index.html

        AuthType Basic
        AuthName "OpenSooq Sentry"
        AuthUserFile /etc/apache2/opensooq-sentry.htpasswd
        <RequireAll>
            Require ip 10.0.0.0/8 192.168.0.0/16
            Require valid-user
        </RequireAll>
    </Directory>

    ProxyPass        /api/ http://127.0.0.1:3100/api/
    ProxyPassReverse /api/ http://127.0.0.1:3100/api/

    <Location "/api/">
        AuthType Basic
        AuthName "OpenSooq Sentry"
        AuthUserFile /etc/apache2/opensooq-sentry.htpasswd
        <RequireAll>
            Require ip 10.0.0.0/8 192.168.0.0/16
            Require valid-user
        </RequireAll>
        RequestHeader set X-Remote-User "expr=%{REMOTE_USER}"
    </Location>
</VirtualHost>`}</Pre>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Validate and reload</CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Pre>{`sudo apachectl configtest
sudo systemctl reload apache2`}</Pre>
            </CardBody>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}

function Verify() {
  return (
    <Stack gap={16}>
      <Text>From an allowlisted address:</Text>
      <Card>
        <CardHeader>Smoke request</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`curl -u sentry-admin https://sentry.internal.example/api/config`}</Pre>
        </CardBody>
      </Card>

      <H3>Checklist</H3>
      <Table
        headers={["Check", "Expected"]}
        rowTone={[
          "danger",
          "danger",
          "danger",
          "success",
          "success",
          "info",
          "info",
          "warning",
          "warning",
        ]}
        rows={[
          ["No HTTP credentials", "401"],
          ["Non-allowlisted address", "403"],
          ["Port 3100 remotely", "Unreachable"],
          ["Dashboard", "Loads; browser uses /api"],
          ["systemd", "opensooq-sentry healthy"],
          ["Sources", "Expected enabled definitions"],
          ["ELK / Releases / Jira / GitLab", "Work only when explicitly requested"],
          ["Retention", "30-day setting present"],
          ["Raw ELK viewing", "Intended production setting"],
        ]}
        striped
      />
    </Stack>
  );
}

function Ops() {
  return (
    <Stack gap={16}>
      <H3>Back up SQLite</H3>
      <Callout tone="warning" title="Do not cp a live DB">
        SQLite may be in WAL mode. Use the online backup command, not a plain
        copy of the main file.
      </Callout>
      <Card>
        <CardHeader>Online backup</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo -u opensooq-sentry sqlite3 \\
  /var/lib/opensooq-sentry/os-sentry.sqlite \\
  ".timeout 10000" \\
  ".backup '/var/backups/opensooq-sentry/os-sentry-$(date +%F-%H%M%S).sqlite'"`}</Pre>
        </CardBody>
      </Card>
      <Text size="small" tone="secondary">
        Run from a root-managed cron job or systemd timer with short retention.
        Test restoration before relying on the backup.
      </Text>

      <Divider />

      <H3>Deploy an update</H3>
      <Text size="small" tone="secondary">
        Back up the database first. Migrations run automatically when the API
        starts.
      </Text>
      <Card>
        <CardHeader>Update procedure</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Pre>{`sudo systemctl stop opensooq-sentry
cd /opt/opensooq-sentry
sudo git fetch --all --prune
sudo git checkout <tested-commit>
sudo npm ci
sudo npm test
sudo npm run typecheck
sudo npm run build
sudo chown -R root:root /opt/opensooq-sentry
sudo chown root:opensooq-sentry /opt/opensooq-sentry/.env
sudo chmod 0640 /opt/opensooq-sentry/.env
sudo systemctl start opensooq-sentry
sudo systemctl reload nginx

sudo journalctl -u opensooq-sentry -f`}</Pre>
        </CardBody>
      </Card>

      <Divider />

      <H3>Rollback</H3>
      <Table
        headers={["#", "Action"]}
        rows={[
          ["1", "Stop the API"],
          ["2", "Check out the previously tested commit"],
          ["3", "Run npm ci and npm run build"],
          [
            "4",
            "Restore the pre-deployment SQLite backup if the newer migration is not backward compatible",
          ],
          ["5", "Start the API and verify /api/config, Sources, and the dashboard"],
        ]}
      />
      <Callout tone="danger" title="Do not reset production SQLite">
        Do not delete or reset the production SQLite database as a rollback
        shortcut.
      </Callout>
    </Stack>
  );
}

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case "overview":
      return <Overview />;
    case "prep":
      return <Prep />;
    case "config":
      return <Config />;
    case "runtime":
      return <Runtime />;
    case "proxy":
      return <Proxy />;
    case "verify":
      return <Verify />;
    case "ops":
      return <Ops />;
  }
}

export default function OpensooqSentryDeployment() {
  const [section, setSection] = useCanvasState<SectionId>("section", "overview");
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={6}>
        <H1>OpenSooq Sentry Deployment</H1>
        <Text tone="secondary">
          Linux bare-metal guide: systemd API on loopback, reverse-proxy
          TLS + IP allowlist + Basic Auth, SQLite under{" "}
          <Code>/var/lib/opensooq-sentry</Code>.
        </Text>
      </Stack>

      <Row gap={8} wrap>
        {SECTIONS.map((s) => (
          <Pill
            key={s.id}
            active={section === s.id}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </Pill>
        ))}
      </Row>

      <H2>{active.label}</H2>
      <SectionBody id={active.id} />
    </Stack>
  );
}
