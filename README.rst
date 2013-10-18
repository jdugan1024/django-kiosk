scinet-kiosk
============

This Django app can be used to develop simple interactive kiosks using a
touchscreen or a tablet.

This code was orginally developed for SC12/SCinet.

Quickstart for development
--------------------------

You need to be sure that the LANG environment variable is set.  All shell
examples assume a sh/bash/zsh like shell.  If you use csh/tcsh/etc you may
need to tweak a few things. Here's an example of setting LANG::

    $ export LANG=en_US.UTF-8

To get started with this project you can do the following::

    $ ./mkdevenv
    $ source scinet-kiosk.env
    $ python kiosk_example/manage.py syncdb
    $ python kiosk_example/manage.py runserver

Then visit http://localhost:8000/admin/kiosk/.  You will need to use the
username and password you created during the syncdb step above.

Creating pages
..............

You can create pages by creating a KioskItem of type Page.  A page is an image
that you define clickable regions for.  The root page is called index, so the
first page you should create should have a name of index.  Create this index
page and upload an image via the admin interface.  Once that page is created
you should be able to see your image by going to: http://localhost:8000/.  The
current templates assume that the pages are 1080p (1920x1080 pixels).


Creating popups
...............

You can create popups by creating a KioskItem of type Popup.  A popup is the
content for a popup.  The default template expects the images included to be
300 pixels wide.  


Creating links
..............

You can create links by defining regions on pages.  Links can either point to
other pages or to popups.  To create a link be sure that you have logged into
the admin interface and then visit the page you wish to make links for.  So
for example to update the index page, visit: http://localhost:8000/.  Once
there type 'e'.  You should see a green box saying EDIT in the upper left
corner.  Then you can type 'n' and you will be given a popup that will allow
you to select the target of the link.  Select the target and click OK.  You
can then move and resize the rectangle.  Once it's in the location you want,
type 's' to save the link info.  You can now turn off editing mode and try
your link.

Jon Dugan
26 Dec 2012
