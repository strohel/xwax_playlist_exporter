#!/bin/bash

NAME="xwax_playlist_exporter"
VERSION=$(git describe)
if [ "x${VERSION}" = "x" ]; then
	echo "Cannot determine version"
	exit 1
fi

git archive --format=tar --prefix="${NAME}/" HEAD^{tree} | gzip > "${NAME}-${VERSION}.amarokscript.tar.gz"
