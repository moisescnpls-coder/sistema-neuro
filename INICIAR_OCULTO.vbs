Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
CurrentPath = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = CurrentPath

' Launch Backend (Which now serves the Frontend too)
' This runs "node backend/index.js" hidden
WshShell.Run "cmd /c node backend/index.js", 0, false

' Optional: Verify they are running
' WScript.Echo "Sistema iniciado en segundo plano (Puerto 5000)."
