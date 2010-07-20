Importer.loadQtBinding("qt.core");
Importer.loadQtBinding("qt.gui");

function substitute(format, track)
{
	var ret = new String(format);
	var sub, value;
	var pad2 = ["trackNumber"];
	var pad3 = ["bpm"];

	for(var i = 0; i < substitutions.length; i++) {
		sub = substitutions[i];
		if(format.indexOf("%" + sub) >= 0) {

			// special cases:
			if(sub == "fancyRating") {
				value = "";
				var j = track.rating;
				for(; j >= 2; j -= 2)
					value += "*";
				if(j == 1)
					value += ".";
				ret = ret.replace("%" + sub, value);

			// standard case:
			} else {
				value = String(track[sub]);
				var padTo = 0;
				if(pad2.indexOf(sub) >= 0) // values padded to 2 chars
					padTo = 2;
				if(pad3.indexOf(sub) >= 0) // values padded to 3 chars
					padTo = 3;
				while(value.length < padTo) {
					value = "0" + value;
				}
				ret = ret.replace("%" + sub, value);
			}

		}
	}

	return ret;
}

function getPlaylist()
{
	ret = new Array();
	var artistFormat = window.settingsGroup.artistFormatEdit.text;
	var titleFormat = window.settingsGroup.titleFormatEdit.text;

	filenames = Amarok.Playlist.filenames(); // we must fill it this time
	for(var i = 0; i < Amarok.Playlist.totalTrackCount(); i++) {
		var track = Amarok.Playlist.trackAt(i);
		ret[i] = "";
		//ret[i] += filenames[i] + "\t"; // track.url returns it urlencoded
		ret[i] += substitute(artistFormat, track) + "\t";
		ret[i] += substitute(titleFormat, track);
	}

	return ret;
}

function fillTextEditWithPlaylist()
{
	window.playlistGroup.playlistTextEdit.setPlainText(getPlaylist().join("\n"));
}

function saveConfig()
{
	Amarok.Script.writeConfig("artistFormat", window.settingsGroup.artistFormatEdit.text);
	Amarok.Script.writeConfig("titleFormat", window.settingsGroup.titleFormatEdit.text);
	Amarok.Script.writeConfig("dialogWidth", String(window.width));
	Amarok.Script.writeConfig("dialogHeight", String(window.height));
	Amarok.Script.writeConfig("lastFilename", window.saveToLine.saveToLineEdit.text);
}

function selectFilename()
{
	var filename = window.saveToLine.saveToLineEdit.text;
	filename = QFileDialog.getSaveFileName(this, "Save xwax Playlist As", filename, "", "", QFileDialog.DontConfirmOverwrite);
	window.saveToLine.saveToLineEdit.text = filename;
}

function save()
{ try {
	var playlist = window.playlistGroup.playlistTextEdit.plainText.split("\n");
	if(playlist.length != filenames.length) {
		Amarok.alert("Number of entries in playlist (" + playlist.length + ") doesn't match original number of entries (" + filenames.length + ").");
		return;
	}

	var filename = window.saveToLine.saveToLineEdit.text;
	if(filename == "") {
		Amarok.alert("You must provide a filename in order to save a playlist.");
		return;
	}
	var file = new QFile(filename);

	if(!file.open(QIODevice.WriteOnly)) {
		Amarok.alert("Cannot open file " + filename + " for writing.");
		return;
	}

	file.resize(0); // truncate file

	var textStream = new QTextStream(file);
	for(var i = 0; i < filenames.length; i++) {
		/// TODO: encodings
		textStream.writeString(filenames[i]);
		textStream.writeString("\t");
		textStream.writeString(playlist[i]);
		textStream.writeString("\n");
	}

	file.close();
	saveConfig();
	window.close();
} catch(error) {
	Amarok.alert(error);
}
}

function close()
{ try {
	saveConfig();
	window.close();
} catch(error) {
	Amarok.alert(error);
}
}

function exportXwaxPlaylist()
{ try {
	var artistFormat, titleFormat, dialogWidth, dialogHeight, lastFilename;
	artistFormat = Amarok.Script.readConfig("artistFormat", "%artist");
	titleFormat = Amarok.Script.readConfig("titleFormat", "%title");
	dialogWidth = Amarok.Script.readConfig("dialogWidth", String("650"));
	dialogHeight = Amarok.Script.readConfig("dialogHeight", String("550"));
	lastFilename = Amarok.Script.readConfig("lastFilename", "");

	substitutions = ["artist", "title", "album", "trackNumber", "discNumber", "year", "genre", "composer", "bitrate", "score", "rating", "fancyRating", "playCount", "bpm", "comment", "path"];


	var layout = new QVBoxLayout();

	var settingsGroup = new QGroupBox("Playlist Format Settings");
	settingsGroup.objectName = "settingsGroup";
	layout.addWidget(settingsGroup, 0, 0);

	var settingsLayout = new QGridLayout();
	settingsGroup.setLayout(settingsLayout);
	settingsLayout.setColumnStretch(1, 1);
	settingsLayout.setColumnStretch(3, 2);

	var tooltip = "Available substitutions: <b>%" + substitutions.join("</b>, <b>%") + "</b>";
	var temp = new QLabel("Artist format:");
	temp.alignment = new Qt.Alignment(Qt.AlignRight | Qt.AlignVCenter);
	settingsLayout.addWidget(temp, 0, 0);
	var artistFormatEdit = new QLineEdit(artistFormat);
	artistFormatEdit.objectName = "artistFormatEdit";
	artistFormatEdit.editingFinished.connect(fillTextEditWithPlaylist);
	artistFormatEdit.toolTip = tooltip;
	settingsLayout.addWidget(artistFormatEdit, 0, 1);
	temp = new QLabel("Title format:");
	temp.alignment = new Qt.Alignment(Qt.AlignRight | Qt.AlignVCenter);
	settingsLayout.addWidget(temp, 0, 2);
	var titleFormatEdit = new QLineEdit(titleFormat);
	titleFormatEdit.objectName = "titleFormatEdit";
	titleFormatEdit.editingFinished.connect(fillTextEditWithPlaylist);
	titleFormatEdit.toolTip = tooltip;
	settingsLayout.addWidget(titleFormatEdit, 0, 3);

	settingsLayout.addWidget(new QLabel("Filesystem charset:"), 1, 0);
	temp = new QLineEdit("UTF-8");
	temp.objectName = "filesystemCharset";
	temp.enabled = false;
	settingsLayout.addWidget(temp, 1, 1);
	settingsLayout.addWidget(new QLabel("Display charset:"), 1, 2);
	temp = new QLineEdit("UTF-8");
	temp.objectName = "displayCharset";
	temp.enabled = false;
	settingsLayout.addWidget(temp, 1, 3);


	var playlistGroup = new QGroupBox("Playlist Preview");
	playlistGroup.objectName = "playlistGroup";
	layout.addWidget(playlistGroup, 0, 0);

	var playlistLayout = new QVBoxLayout();
	playlistGroup.setLayout(playlistLayout);

	var playlistTextEdit = new QTextEdit();
	playlistTextEdit.objectName = "playlistTextEdit";
	playlistTextEdit.acceptRitchText = false;
	playlistTextEdit.lineWrapMode = QTextEdit.NoWrap;
	playlistTextEdit.tabStopWidth = dialogWidth * 0.33;
	playlistLayout.addWidget(playlistTextEdit, 0, 0);
	playlistLayout.addWidget(new QLabel("<i>Limited editing possible as long as you don't move/remove any line. Tab separates artist and title.</i>"), 0, 0);


	var saveToLine = new QWidget();
	saveToLine.objectName = "saveToLine";
	layout.addWidget(saveToLine, 0, 0);

	var saveToLayout = new QGridLayout();
	saveToLine.setLayout(saveToLayout);

	saveToLayout.addWidget(new QLabel("Save to:"), 0, 0);
	saveToLineEdit = new QLineEdit(lastFilename);
	saveToLineEdit.objectName = "saveToLineEdit";
	saveToLayout.addWidget(saveToLineEdit, 0, 1);
	var selectFilenameButton = new QPushButton(QIcon.fromTheme("document-open"), "");
	selectFilenameButton.clicked.connect(selectFilename);
	saveToLayout.addWidget(selectFilenameButton, 0, 3);
	saveToLayout.addWidget(new QLabel("<i>The file will be overwritten without asking.</i>"), 1, 1);


	var bottomLine = new QWidget();
	layout.addWidget(bottomLine, 0, 0);

	var bottomLayout = new QHBoxLayout();
	bottomLine.setLayout(bottomLayout);

	bottomLayout.addStretch(0);
	var saveButton = new QPushButton(QIcon.fromTheme("document-save"), "Save");
	saveButton["default"] = true;
	saveButton.clicked.connect(save);
	bottomLayout.addWidget(saveButton, 0, 0);
	var cancelButton = new QPushButton(QIcon.fromTheme("dialog-cancel"), "Cancel");
	cancelButton.clicked.connect(close);
	bottomLayout.addWidget(cancelButton, 0, 0);


	window = new QWidget(this);
	window.setLayout(layout);
	window.resize(dialogWidth, dialogHeight);
	window.windowTitle = "xwax Playlist Exporter";
	fillTextEditWithPlaylist(); // must be after assignig layout to window

	window.show();

} catch(error) {
	Amarok.alert("xwax Playlist Exporter error: " + error);
}
}

var window, filenames, substitutions;

if ( Amarok.Window.addToolsMenu("export_xwax_playlist", "Export playlist for xwax", "preferences-desktop-sound") ) {
	Amarok.Window.ToolsMenu.export_xwax_playlist['triggered()'].connect(exportXwaxPlaylist);
} else {
	Amarok.debug("Export playlist for xwax menu entry already exists!");
}
