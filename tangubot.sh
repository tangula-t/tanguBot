#!/bin/bash

pidfile=$HOME/.tangubot.pid
# Change this! :
workfolder=$HOME/discord/tanguBot 

check_pidfile() {
	if [ ! -f $pidfile ] 
	then
		echo "Could not find pidfile"
		exit 1
	fi
}

tstart() {
  container=$(docker run --user=1000 --init -v $workfolder:/var/bot -t -i -w /var/bot --rm --detach node:17-alpine node main.js)
  echo $container > $pidfile
}

case "$1" in
  start)
	if [ -f $pidfile ]
	then
		echo "$pidfile exists."
		exit 2
	fi
	tstart	
	echo "Started tangubot"
  	;;
  stop)
	check_pidfile
	docker stop $(cat $pidfile) 
	rm $pidfile
	echo "Stopped tangubot"
  	;;

  log)
	check_pidfile
	docker logs $(cat $pidfile) $2
	;;
  attach)
	check_pidfile
	docker attach $(cat $pidfile) 
	;;
  devreload)
	docker stop $(cat $pidfile) 
	rm $pidfile
   	tstart	
	docker attach $(cat $pidfile) 
esac

exit 0
