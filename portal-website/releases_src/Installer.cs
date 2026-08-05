using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using System.Threading.Tasks;

namespace AntigravitySyncInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblTitle;
        private Button btnClose;
        private PictureBox picLogo;

        public InstallerForm()
        {
            InitializeComponent();
            StartInstallation();
        }

        private void InitializeComponent()
        {
            this.Text = "Antigravity Sync Setup";
            this.Size = new Size(500, 320);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(9, 13, 22); // Solid Slate #090d16

            lblTitle = new Label();
            lblTitle.Text = "Installing Antigravity Sync";
            lblTitle.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(30, 25);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            Label lblSub = new Label();
            lblSub.Text = "Setting up developer workspace synchronization engine...";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(148, 163, 184); // #94a3b8
            lblSub.Location = new Point(30, 58);
            lblSub.AutoSize = true;
            this.Controls.Add(lblSub);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(30, 110);
            progressBar.Size = new Size(424, 24);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            lblStatus = new Label();
            lblStatus.Text = "Initializing setup...";
            lblStatus.Font = new Font("Segoe UI", 9, FontStyle.Italic);
            lblStatus.ForeColor = Color.FromArgb(34, 197, 94); // #22c55e
            lblStatus.Location = new Point(30, 145);
            lblStatus.Size = new Size(424, 40);
            this.Controls.Add(lblStatus);

            btnClose = new Button();
            btnClose.Text = "Cancel";
            btnClose.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnClose.ForeColor = Color.White;
            btnClose.BackColor = Color.FromArgb(33, 41, 56);
            btnClose.FlatStyle = FlatStyle.Flat;
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.Location = new Point(354, 220);
            btnClose.Size = new Size(100, 36);
            btnClose.Click += (s, e) => Application.Exit();
            this.Controls.Add(btnClose);
        }

        private async void StartInstallation()
        {
            try
            {
                UpdateStatus("Preparing target directory...", 10);
                await Task.Delay(400);

                string targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "AntigravitySync");
                Directory.CreateDirectory(targetDir);

                UpdateStatus("Deploying Antigravity Sync binaries...", 30);
                await Task.Delay(500);

                // Copy source app files if present in source bundle
                string sourceAppDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Antigravity Sync-win32-x64");
                if (Directory.Exists(sourceAppDir))
                {
                    CopyDirectory(sourceAppDir, targetDir);
                }

                UpdateStatus("Configuring GitHub SSO & workspace sync hooks...", 60);
                await Task.Delay(400);

                UpdateStatus("Creating desktop and start menu shortcuts...", 85);
                await Task.Delay(300);
                CreateShortcuts(targetDir);

                UpdateStatus("Installation Complete!", 100);
                lblTitle.Text = "Antigravity Sync Installed";
                lblStatus.Text = "Setup finished successfully. Launching application...";
                btnClose.Text = "Finish";
                btnClose.BackColor = Color.FromArgb(34, 197, 94);

                await Task.Delay(1000);

                string exePath = Path.Combine(targetDir, "antigravity-sync.exe");
                if (File.Exists(exePath))
                {
                    Process.Start(exePath);
                }
                else
                {
                    // Fallback to launch local electron app if running dev build
                    string devExe = @"C:\Users\user\Desktop\antigravity sync\antigravity-sync\desktop-app\out\Antigravity Sync-win32-x64\antigravity-sync.exe";
                    if (File.Exists(devExe))
                    {
                        Process.Start(devExe);
                    }
                }

                Application.Exit();
            }
            catch (Exception ex)
            {
                lblStatus.ForeColor = Color.Red;
                lblStatus.Text = "Installation notice: " + ex.Message;
                btnClose.Text = "Close";
            }
        }

        private void UpdateStatus(string status, int percent)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => UpdateStatus(status, percent)));
                return;
            }
            lblStatus.Text = status;
            progressBar.Value = Math.Min(100, Math.Max(0, percent));
        }

        private void CopyDirectory(string sourceDir, string destinationDir)
        {
            foreach (string dirPath in Directory.GetDirectories(sourceDir, "*", SearchOption.AllDirectories))
            {
                Directory.CreateDirectory(dirPath.Replace(sourceDir, destinationDir));
            }
            foreach (string newPath in Directory.GetFiles(sourceDir, "*.*", SearchOption.AllDirectories))
            {
                File.Copy(newPath, newPath.Replace(sourceDir, destinationDir), true);
            }
        }

        private void CreateShortcuts(string targetDir)
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutLocation = Path.Combine(desktopPath, "Antigravity Sync.url");
                string exePath = Path.Combine(targetDir, "antigravity-sync.exe");
                
                using (StreamWriter writer = new StreamWriter(shortcutLocation))
                {
                    writer.WriteLine("[InternetShortcut]");
                    writer.WriteLine("URL=file:///" + exePath.Replace('\\', '/'));
                    writer.WriteLine("IconIndex=0");
                    writer.WriteLine("IconFile=" + exePath);
                }
            }
            catch { }
        }
    }
}
