namespace Atlament
{
    partial class AtlamentMainForm
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            webView = new Microsoft.Web.WebView2.WinForms.WebView2();
            ((System.ComponentModel.ISupportInitialize)webView).BeginInit();
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            webView.AllowExternalDrop = false;
            webView.CreationProperties = null;
            webView.DefaultBackgroundColor = System.Drawing.Color.White;
            webView.Dock = System.Windows.Forms.DockStyle.Fill;
            webView.Location = new System.Drawing.Point(0, 0);
            webView.Name = "webView";
            webView.Size = new System.Drawing.Size(1180, 760);
            webView.TabIndex = 0;
            webView.ZoomFactor = 1D;
            this.ClientSize = new System.Drawing.Size(1180, 760);
            this.Controls.Add(webView);
            this.MinimumSize = new System.Drawing.Size(960, 640);
            this.Name = "AtlamentMainForm";
            this.Text = "Atlament";
            ((System.ComponentModel.ISupportInitialize)webView).EndInit();
        }

        #endregion

        private Microsoft.Web.WebView2.WinForms.WebView2 webView;
    }
}
