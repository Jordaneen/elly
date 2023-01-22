using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace ElesisScreen
{
    public class Main
    {
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [StructLayout(LayoutKind.Sequential)]
        private struct Rect
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MouseInput
        {
            public int dx;
            public int dy;
            public int mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct KeyboardInput
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct HardwareInput
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion
        {
            [FieldOffset(0)] public MouseInput mi;
            [FieldOffset(0)] public KeyboardInput ki;
            [FieldOffset(0)] public HardwareInput hi;
        }

        public struct Input
        {
            public int type;
            public InputUnion u;
        }

        [Flags]
        public enum InputType
        {
            Mouse = 0,
            Keyboard = 1,
            Hardware = 2
        }

        [Flags]
        public enum KeyEventF
        {
            KeyDown = 0x0000,
            ExtendedKey = 0x0001,
            KeyUp = 0x0002,
            Unicode = 0x0004,
            Scancode = 0x0008
        }

        [Flags]
        public enum MouseEventF
        {
            Absolute = 0x8000,
            HWheel = 0x01000,
            Move = 0x0001,
            MoveNoCoalesce = 0x2000,
            LeftDown = 0x0002,
            LeftUp = 0x0004,
            RightDown = 0x0008,
            RightUp = 0x0010,
            MiddleDown = 0x0020,
            MiddleUp = 0x0040,
            VirtualDesk = 0x4000,
            Wheel = 0x0800,
            XDown = 0x0080,
            XUp = 0x0100
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, Input[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        private static extern IntPtr GetMessageExtraInfo();

        [DllImport("user32.dll")]
        public static extern bool GetCursorPos(out Point lpPoint);

        [DllImport("User32.dll")]
        public static extern bool SetCursorPos(int x, int y);

        [DllImport("user32.dll")]
        private static extern IntPtr GetWindowRect(IntPtr hWnd, ref Rect rect);

        [DllImport("user32.dll")]
        private static extern IntPtr SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern IntPtr GetClientRect(IntPtr hWnd, ref Rect rect);

        [DllImport("user32.dll")]
        private static extern IntPtr ClientToScreen(IntPtr hWnd, ref Point point);

        public async Task<object> CaptureWindow(dynamic strHandle)
        {
            // TODO: comment what this code does
            var proc = Process.GetProcessesByName((string)strHandle)[0];
            var wHandle = proc.MainWindowHandle;

            SetForegroundWindow(wHandle);
            Thread.Sleep(150);

            var rect = new Rect();
            GetClientRect(wHandle, ref rect);

            var point = new Point(0, 0);
            ClientToScreen(wHandle, ref point);

            var bounds = new Rectangle(point.X, point.Y, rect.Right, rect.Bottom);
            var result = new Bitmap(bounds.Width, bounds.Height);

            using (var graphics = Graphics.FromImage(result))
            {
                graphics.CopyFromScreen(new Point(bounds.Left, bounds.Top), Point.Empty, bounds.Size);

            }

            ImageConverter conv = new ImageConverter();

            return (byte[])conv.ConvertTo(result, typeof(byte[]));
        }
        public async Task<object> FakeInput(dynamic strHandle)
        {
            // mps
            var position = new Point(0, 0);
            GetCursorPos(out position);

            Input[] inputs = new Input[]
            {
                new Input
                {
                    type = (int)InputType.Mouse,
                    u = new InputUnion
                    {
                        mi = new MouseInput
                        {
                            dx = position.X,
                            dy = position.Y,
                            dwFlags = (uint)MouseEventF.Wheel,
                            mouseData = 20,
                        dwExtraInfo = GetMessageExtraInfo()
                        }
                    }
                }
            };
            Input[] inputs2 = new Input[]
            {
                new Input
                {
                    type = (int)InputType.Mouse,
                    u = new InputUnion
                    {
                        mi = new MouseInput
                        {
                            dx = position.X,
                            dy = position.Y,
                            dwFlags = (uint)MouseEventF.Wheel,
                            mouseData = -20,
                        dwExtraInfo = GetMessageExtraInfo()
                        }
                    }
                }
            };

            // send input
            Thread.Sleep(150);

            return true;
        }
    }
}