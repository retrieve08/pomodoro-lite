using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace PomodoroLite
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new PomodoroForm());
        }
    }

    internal sealed class PomodoroForm : Form
    {
        private const int NormalWidth = 360;
        private const int NormalHeight = 540;
        private const int CompactWidth = 310;
        private const int CompactHeight = 58;

        private readonly Timer timer = new Timer();
        private readonly NumericUpDown countInput = new NumericUpDown();
        private readonly NumericUpDown workInput = new NumericUpDown();
        private readonly NumericUpDown breakInput = new NumericUpDown();
        private readonly Label phaseLabel = new Label();
        private readonly Label timeLabel = new Label();
        private readonly Label progressLabel = new Label();
        private readonly Label todayLabel = new Label();
        private readonly Button startButton = new RoundedButton();
        private readonly Button pauseButton = new RoundedButton();
        private readonly Button stopButton = new RoundedButton();
        private readonly Button topButton = new RoundedButton();
        private readonly Button compactButton = new RoundedButton();
        private readonly Button weekButton = new RoundedButton();
        private readonly Panel normalPanel = new Panel();
        private readonly Panel compactPanel = new Panel();
        private readonly Label compactPhaseLabel = new Label();
        private readonly Label compactTimeLabel = new Label();
        private readonly Button expandButton = new RoundedButton();
        private readonly StatsStore statsStore = new StatsStore();

        private SessionStatus status = SessionStatus.Idle;
        private Phase phase = Phase.Work;
        private int totalPomodoros = 2;
        private int currentPomodoro = 1;
        private int workMinutes = 25;
        private int breakMinutes = 5;
        private int remainingSeconds = 25 * 60;
        private int phaseTotalSeconds = 25 * 60;
        private bool isCompact;

        public PomodoroForm()
        {
            Text = "番茄钟";
            StartPosition = FormStartPosition.Manual;
            Size = new Size(NormalWidth, NormalHeight);
            MinimumSize = new Size(300, 360);
            FormBorderStyle = FormBorderStyle.SizableToolWindow;
            BackColor = Color.FromArgb(247, 244, 237);
            Font = new Font("Microsoft YaHei UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            BuildNormalPanel();
            BuildCompactPanel();

            Controls.Add(normalPanel);
            Controls.Add(compactPanel);

            timer.Interval = 1000;
            timer.Tick += OnTimerTick;

            Load += delegate
            {
                PositionTopRight();
                statsStore.MigrateElectronStatsIfPresent();
                RefreshStats();
                ApplySettingsToIdleDisplay();
            };
        }

        private void BuildNormalPanel()
        {
            normalPanel.Dock = DockStyle.Fill;
            normalPanel.Padding = new Padding(16);
            normalPanel.BackColor = Color.FromArgb(255, 250, 242);

            Label appLabel = MakeLabel("个人番茄钟", 12, Color.FromArgb(107, 114, 128));
            appLabel.SetBounds(16, 16, 180, 22);

            phaseLabel.Font = new Font(Font.FontFamily, 20, FontStyle.Bold);
            phaseLabel.ForeColor = Color.FromArgb(34, 40, 49);
            phaseLabel.SetBounds(16, 42, 150, 34);

            topButton.Text = "置顶";
            topButton.SetBounds(218, 20, 58, 32);
            StyleSoftButton(topButton);
            topButton.Click += delegate
            {
                TopMost = !TopMost;
                topButton.BackColor = TopMost ? Color.FromArgb(204, 251, 241) : Color.FromArgb(248, 250, 252);
                topButton.ForeColor = TopMost ? Color.FromArgb(17, 94, 89) : Color.FromArgb(55, 65, 81);
            };

            compactButton.Text = "折叠";
            compactButton.SetBounds(286, 20, 52, 32);
            StyleSoftButton(compactButton);
            compactButton.Click += delegate { SetCompact(true); };

            timeLabel.Font = new Font(Font.FontFamily, 48, FontStyle.Bold);
            timeLabel.ForeColor = Color.FromArgb(17, 24, 39);
            timeLabel.SetBounds(16, 96, 320, 76);

            progressLabel.ForeColor = Color.FromArgb(107, 114, 128);
            progressLabel.SetBounds(18, 176, 320, 26);

            AddNumberField("番茄数量", countInput, 16, 222, 2);
            AddNumberField("工作分钟", workInput, 126, 222, 25);
            AddNumberField("休息分钟", breakInput, 236, 222, 5);

            startButton.Text = "开始";
            startButton.SetBounds(16, 304, 100, 38);
            StylePrimaryButton(startButton);
            startButton.Click += delegate { StartSession(); };

            pauseButton.Text = "暂停";
            pauseButton.SetBounds(126, 304, 100, 38);
            StyleSoftButton(pauseButton);
            pauseButton.Enabled = false;
            pauseButton.Click += delegate { TogglePause(); };

            stopButton.Text = "停止";
            stopButton.SetBounds(236, 304, 100, 38);
            StyleSoftButton(stopButton);
            stopButton.Enabled = false;
            stopButton.Click += delegate { StopSession(); };

            Label todayTitle = MakeLabel("今日番茄工作", 12, Color.FromArgb(107, 114, 128));
            todayTitle.SetBounds(16, 376, 180, 24);

            todayLabel.Font = new Font(Font.FontFamily, 20, FontStyle.Bold);
            todayLabel.SetBounds(16, 402, 180, 36);

            weekButton.Text = "查看本周每天";
            weekButton.SetBounds(196, 386, 140, 38);
            StyleAccentButton(weekButton);
            weekButton.Click += delegate { ShowWeekDetails(); };

            normalPanel.Controls.Add(appLabel);
            normalPanel.Controls.Add(phaseLabel);
            normalPanel.Controls.Add(topButton);
            normalPanel.Controls.Add(compactButton);
            normalPanel.Controls.Add(timeLabel);
            normalPanel.Controls.Add(progressLabel);
            normalPanel.Controls.Add(startButton);
            normalPanel.Controls.Add(pauseButton);
            normalPanel.Controls.Add(stopButton);
            normalPanel.Controls.Add(todayTitle);
            normalPanel.Controls.Add(todayLabel);
            normalPanel.Controls.Add(weekButton);
        }

        private void BuildCompactPanel()
        {
            compactPanel.Dock = DockStyle.Fill;
            compactPanel.Visible = false;
            compactPanel.BackColor = Color.FromArgb(255, 250, 242);
            compactPanel.MouseDown += DragWindow;

            compactPhaseLabel.ForeColor = Color.FromArgb(107, 114, 128);
            compactPhaseLabel.SetBounds(12, 17, 62, 24);
            compactPhaseLabel.MouseDown += DragWindow;

            compactTimeLabel.Font = new Font(Font.FontFamily, 22, FontStyle.Bold);
            compactTimeLabel.SetBounds(78, 9, 130, 40);
            compactTimeLabel.MouseDown += DragWindow;

            expandButton.Text = "展开";
            expandButton.SetBounds(226, 11, 66, 34);
            StyleSoftButton(expandButton);
            expandButton.Click += delegate { SetCompact(false); };

            compactPanel.Controls.Add(compactPhaseLabel);
            compactPanel.Controls.Add(compactTimeLabel);
            compactPanel.Controls.Add(expandButton);
        }

        private void AddNumberField(string title, NumericUpDown input, int x, int y, int value)
        {
            Label label = MakeLabel(title, 12, Color.FromArgb(107, 114, 128));
            label.SetBounds(x, y, 96, 22);
            input.Minimum = 1;
            input.Maximum = 999;
            input.Value = value;
            input.SetBounds(x, y + 26, 96, 34);
            input.ValueChanged += delegate { ApplySettingsToIdleDisplay(); };
            normalPanel.Controls.Add(label);
            normalPanel.Controls.Add(input);
        }

        private void StylePrimaryButton(Button button)
        {
            StyleButtonBase(button);
            button.BackColor = Color.FromArgb(20, 118, 110);
            button.ForeColor = Color.White;
            button.FlatAppearance.BorderColor = Color.FromArgb(20, 118, 110);
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(15, 92, 86);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(17, 74, 69);
        }

        private void StyleAccentButton(Button button)
        {
            StyleButtonBase(button);
            button.BackColor = Color.FromArgb(254, 243, 199);
            button.ForeColor = Color.FromArgb(120, 53, 15);
            button.FlatAppearance.BorderColor = Color.FromArgb(252, 211, 77);
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(253, 230, 138);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(251, 191, 36);
        }

        private void StyleSoftButton(Button button)
        {
            StyleButtonBase(button);
            button.BackColor = Color.FromArgb(248, 250, 252);
            button.ForeColor = Color.FromArgb(55, 65, 81);
            button.FlatAppearance.BorderColor = Color.FromArgb(226, 232, 240);
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(241, 245, 249);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(226, 232, 240);
        }

        private void StyleButtonBase(Button button)
        {
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 1;
            button.Font = new Font(Font.FontFamily, 9F, FontStyle.Bold, GraphicsUnit.Point);
            button.Cursor = Cursors.Hand;
            button.UseVisualStyleBackColor = false;
        }

        private Label MakeLabel(string text, int size, Color color)
        {
            return new Label
            {
                Text = text,
                AutoSize = false,
                ForeColor = color,
                Font = new Font(Font.FontFamily, size, FontStyle.Regular, GraphicsUnit.Point)
            };
        }

        private void PositionTopRight()
        {
            Rectangle area = Screen.FromControl(this).WorkingArea;
            Location = new Point(area.Right - Width - 16, area.Top + 16);
        }

        private void ApplySettingsToIdleDisplay()
        {
            if (status != SessionStatus.Idle)
            {
                return;
            }

            totalPomodoros = (int)countInput.Value;
            workMinutes = (int)workInput.Value;
            breakMinutes = (int)breakInput.Value;
            phase = Phase.Work;
            currentPomodoro = 1;
            phaseTotalSeconds = workMinutes * 60;
            remainingSeconds = phaseTotalSeconds;
            UpdateUi();
        }

        private void StartSession()
        {
            totalPomodoros = (int)countInput.Value;
            workMinutes = (int)workInput.Value;
            breakMinutes = (int)breakInput.Value;
            currentPomodoro = 1;
            phase = Phase.Work;
            status = SessionStatus.Running;
            phaseTotalSeconds = workMinutes * 60;
            remainingSeconds = phaseTotalSeconds;
            timer.Start();
            UpdateUi();
        }

        private void TogglePause()
        {
            if (status == SessionStatus.Running)
            {
                status = SessionStatus.Paused;
                timer.Stop();
            }
            else if (status == SessionStatus.Paused)
            {
                status = SessionStatus.Running;
                timer.Start();
            }

            UpdateUi();
        }

        private void StopSession()
        {
            timer.Stop();
            status = SessionStatus.Idle;
            ApplySettingsToIdleDisplay();
        }

        private void OnTimerTick(object sender, EventArgs e)
        {
            if (status != SessionStatus.Running)
            {
                return;
            }

            if (remainingSeconds > 0)
            {
                remainingSeconds--;
                UpdateUi();
                return;
            }

            AdvancePhase();
        }

        private void AdvancePhase()
        {
            if (phase == Phase.Work)
            {
                statsStore.RecordCompletion(workMinutes);
                RefreshStats();
                BeginPhase(Phase.Break);
                return;
            }

            if (currentPomodoro >= totalPomodoros)
            {
                timer.Stop();
                status = SessionStatus.Done;
                remainingSeconds = 0;
                UpdateUi();
                return;
            }

            currentPomodoro++;
            BeginPhase(Phase.Work);
        }

        private void BeginPhase(Phase nextPhase)
        {
            phase = nextPhase;
            phaseTotalSeconds = (phase == Phase.Work ? workMinutes : breakMinutes) * 60;
            remainingSeconds = phaseTotalSeconds;
            UpdateUi();
        }

        private void RefreshStats()
        {
            todayLabel.Text = statsStore.GetTodayMinutes().ToString(CultureInfo.InvariantCulture) + " 分钟";
        }

        private void ShowWeekDetails()
        {
            List<DaySummary> days = statsStore.GetThisWeekByMinutes();
            using (WeekDetailsForm form = new WeekDetailsForm(days))
            {
                form.ShowDialog(this);
            }
        }

        private void SetCompact(bool compact)
        {
            isCompact = compact;
            normalPanel.Visible = !compact;
            compactPanel.Visible = compact;

            if (compact)
            {
                FormBorderStyle = FormBorderStyle.None;
                MinimumSize = new Size(CompactWidth, CompactHeight);
                Size = new Size(CompactWidth, CompactHeight);
            }
            else
            {
                FormBorderStyle = FormBorderStyle.SizableToolWindow;
                MinimumSize = new Size(300, 360);
                Size = new Size(NormalWidth, NormalHeight);
                PositionTopRight();
            }

            UpdateUi();
        }

        private void UpdateUi()
        {
            string formatted = FormatTime(remainingSeconds);
            string phaseText = GetPhaseText();
            phaseLabel.Text = phaseText;
            compactPhaseLabel.Text = phaseText;
            timeLabel.Text = formatted;
            compactTimeLabel.Text = formatted;
            progressLabel.Text = GetProgressText();
            pauseButton.Text = status == SessionStatus.Paused ? "继续" : "暂停";
            pauseButton.Enabled = status == SessionStatus.Running || status == SessionStatus.Paused;
            stopButton.Enabled = status == SessionStatus.Running || status == SessionStatus.Paused || status == SessionStatus.Done;
            startButton.Enabled = status != SessionStatus.Running && status != SessionStatus.Paused;
            countInput.Enabled = startButton.Enabled;
            workInput.Enabled = startButton.Enabled;
            breakInput.Enabled = startButton.Enabled;
        }

        private string GetPhaseText()
        {
            if (status == SessionStatus.Idle)
            {
                return "待开始";
            }

            if (status == SessionStatus.Done)
            {
                return "已完成";
            }

            return phase == Phase.Work ? "工作中" : "休息中";
        }

        private string GetProgressText()
        {
            if (status == SessionStatus.Idle)
            {
                return "设置好后开始";
            }

            if (status == SessionStatus.Done)
            {
                return "已完成 " + totalPomodoros + " 个番茄";
            }

            string paused = status == SessionStatus.Paused ? " · 已暂停" : string.Empty;
            return "第 " + currentPomodoro + " / " + totalPomodoros + " 个番茄 · " + (phase == Phase.Work ? "工作" : "休息") + paused;
        }

        private string FormatTime(int seconds)
        {
            int safeSeconds = Math.Max(0, seconds);
            int minutes = safeSeconds / 60;
            int remainder = safeSeconds % 60;
            return minutes.ToString("00", CultureInfo.InvariantCulture) + ":" + remainder.ToString("00", CultureInfo.InvariantCulture);
        }

        private void DragWindow(object sender, MouseEventArgs e)
        {
            if (isCompact && e.Button == MouseButtons.Left)
            {
                ReleaseCapture();
                SendMessage(Handle, 0xA1, new IntPtr(0x2), IntPtr.Zero);
            }
        }

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    }

    internal enum SessionStatus
    {
        Idle,
        Running,
        Paused,
        Done
    }

    internal enum Phase
    {
        Work,
        Break
    }

    internal sealed class RoundedButton : Button
    {
        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (Width <= 0 || Height <= 0)
            {
                return;
            }

            int radius = Math.Min(12, Height / 2);
            using (GraphicsPath path = CreateRoundRectPath(ClientRectangle, radius))
            {
                Region = new Region(path);
            }
        }

        private static GraphicsPath CreateRoundRectPath(Rectangle bounds, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            Rectangle arc = new Rectangle(bounds.X, bounds.Y, diameter, diameter);

            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - diameter - 1;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - diameter - 1;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.X;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal sealed class WeekDetailsForm : Form
    {
        private readonly List<DaySummary> days;

        public WeekDetailsForm(List<DaySummary> days)
        {
            this.days = days;
            Text = "本周统计";
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ShowInTaskbar = false;
            ClientSize = new Size(360, 390);
            BackColor = Color.FromArgb(255, 250, 242);
            Font = new Font("Microsoft YaHei UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            BuildContent();
        }

        private void BuildContent()
        {
            Label title = new Label
            {
                Text = "本周每天番茄工作",
                AutoSize = false,
                Font = new Font(Font.FontFamily, 16, FontStyle.Bold, GraphicsUnit.Point),
                ForeColor = Color.FromArgb(17, 24, 39)
            };
            title.SetBounds(22, 20, 230, 30);

            Label subtitle = new Label
            {
                Text = "按工作时长从高到低排列",
                AutoSize = false,
                ForeColor = Color.FromArgb(107, 114, 128)
            };
            subtitle.SetBounds(24, 52, 220, 22);

            Button closeButton = new RoundedButton
            {
                Text = "完成",
                DialogResult = DialogResult.OK
            };
            closeButton.SetBounds(246, 326, 88, 36);
            StyleDialogButton(closeButton);
            AcceptButton = closeButton;

            Controls.Add(title);
            Controls.Add(subtitle);
            Controls.Add(closeButton);

            int maxMinutes = Math.Max(1, days.Max(day => day.Minutes));
            int y = 90;
            foreach (DaySummary day in days)
            {
                AddDayRow(day, maxMinutes, y);
                y += 32;
            }
        }

        private void AddDayRow(DaySummary day, int maxMinutes, int y)
        {
            Label dayLabel = new Label
            {
                Text = day.Label,
                AutoSize = false,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold, GraphicsUnit.Point),
                ForeColor = Color.FromArgb(55, 65, 81),
                TextAlign = ContentAlignment.MiddleLeft
            };
            dayLabel.SetBounds(24, y, 42, 24);

            Panel track = new Panel
            {
                BackColor = Color.FromArgb(241, 245, 249)
            };
            track.SetBounds(74, y + 6, 170, 12);

            Panel fill = new Panel
            {
                BackColor = day.Minutes == 0 ? Color.FromArgb(203, 213, 225) : Color.FromArgb(20, 118, 110)
            };
            int fillWidth = day.Minutes == 0 ? 0 : Math.Max(8, (int)Math.Round(170.0 * day.Minutes / maxMinutes));
            fill.SetBounds(0, 0, fillWidth, 12);
            track.Controls.Add(fill);

            Label minutesLabel = new Label
            {
                Text = day.Minutes.ToString(CultureInfo.InvariantCulture) + " 分钟",
                AutoSize = false,
                ForeColor = Color.FromArgb(107, 114, 128),
                TextAlign = ContentAlignment.MiddleRight
            };
            minutesLabel.SetBounds(252, y, 82, 24);

            Controls.Add(dayLabel);
            Controls.Add(track);
            Controls.Add(minutesLabel);
        }

        private void StyleDialogButton(Button button)
        {
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = Color.FromArgb(20, 118, 110);
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(15, 92, 86);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(17, 74, 69);
            button.BackColor = Color.FromArgb(20, 118, 110);
            button.ForeColor = Color.White;
            button.Font = new Font(Font.FontFamily, 9F, FontStyle.Bold, GraphicsUnit.Point);
            button.Cursor = Cursors.Hand;
            button.UseVisualStyleBackColor = false;
        }
    }

    internal sealed class DaySummary
    {
        public string Label { get; set; }
        public DateTime Date { get; set; }
        public int Minutes { get; set; }
        public int WeekIndex { get; set; }
    }

    internal sealed class StatsStore
    {
        private readonly string dataDir;
        private readonly string statsPath;

        public StatsStore()
        {
            dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PomodoroLite");
            statsPath = Path.Combine(dataDir, "pomodoro-stats.csv");
        }

        public void RecordCompletion(int workMinutes)
        {
            Directory.CreateDirectory(dataDir);
            string line = DateTime.Now.ToString("o", CultureInfo.InvariantCulture) + "|" + workMinutes.ToString(CultureInfo.InvariantCulture);
            File.AppendAllLines(statsPath, new[] { line });
        }

        public int GetTodayMinutes()
        {
            string today = GetDateKey(DateTime.Now);
            return ReadRecords().Where(record => GetDateKey(record.CompletedAt) == today).Sum(record => record.WorkMinutes);
        }

        public List<DaySummary> GetThisWeekByMinutes()
        {
            DateTime weekStart = GetWeekStart(DateTime.Now);
            DateTime nextWeek = weekStart.AddDays(7);
            string[] labels = { "周一", "周二", "周三", "周四", "周五", "周六", "周日" };

            List<DaySummary> days = Enumerable.Range(0, 7)
                .Select(index => new DaySummary
                {
                    Date = weekStart.AddDays(index),
                    Label = labels[index],
                    Minutes = 0,
                    WeekIndex = index
                })
                .ToList();

            foreach (CompletionRecord record in ReadRecords())
            {
                if (record.CompletedAt < weekStart || record.CompletedAt >= nextWeek)
                {
                    continue;
                }

                int index = (record.CompletedAt.Date - weekStart.Date).Days;
                if (index >= 0 && index < days.Count)
                {
                    days[index].Minutes += record.WorkMinutes;
                }
            }

            return days.OrderByDescending(day => day.Minutes).ThenBy(day => day.WeekIndex).ToList();
        }

        public void MigrateElectronStatsIfPresent()
        {
            if (File.Exists(statsPath))
            {
                return;
            }

            string electronPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "personal-pomodoro", "pomodoro-stats.json");
            if (!File.Exists(electronPath))
            {
                return;
            }

            string json = File.ReadAllText(electronPath);
            List<string> lines = new List<string>();
            System.Text.RegularExpressions.MatchCollection matches = System.Text.RegularExpressions.Regex.Matches(
                json,
                "\"completedAt\"\\s*:\\s*\"([^\"]+)\"\\s*,\\s*\"workMinutes\"\\s*:\\s*(\\d+)");

            foreach (System.Text.RegularExpressions.Match match in matches)
            {
                DateTime completedAt;
                int minutes;
                if (DateTime.TryParse(match.Groups[1].Value, out completedAt) && int.TryParse(match.Groups[2].Value, out minutes))
                {
                    lines.Add(completedAt.ToString("o", CultureInfo.InvariantCulture) + "|" + minutes.ToString(CultureInfo.InvariantCulture));
                }
            }

            if (lines.Count > 0)
            {
                Directory.CreateDirectory(dataDir);
                File.WriteAllLines(statsPath, lines.ToArray());
            }
        }

        private IEnumerable<CompletionRecord> ReadRecords()
        {
            if (!File.Exists(statsPath))
            {
                return Enumerable.Empty<CompletionRecord>();
            }

            List<CompletionRecord> records = new List<CompletionRecord>();
            foreach (string line in File.ReadAllLines(statsPath))
            {
                string[] parts = line.Split('|');
                DateTime completedAt;
                int minutes;
                if (parts.Length == 2 && DateTime.TryParse(parts[0], out completedAt) && int.TryParse(parts[1], out minutes))
                {
                    records.Add(new CompletionRecord { CompletedAt = completedAt, WorkMinutes = minutes });
                }
            }

            return records;
        }

        private static DateTime GetWeekStart(DateTime date)
        {
            DateTime weekStart = date.Date;
            int offset = weekStart.DayOfWeek == DayOfWeek.Sunday ? -6 : DayOfWeek.Monday - weekStart.DayOfWeek;
            return weekStart.AddDays(offset);
        }

        private static string GetDateKey(DateTime date)
        {
            return date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }
    }

    internal sealed class CompletionRecord
    {
        public DateTime CompletedAt { get; set; }
        public int WorkMinutes { get; set; }
    }
}
