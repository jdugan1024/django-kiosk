from django.conf.urls.defaults import *

urlpatterns = patterns('kiosk.views',
        # index
        url(r'^(?P<page>[a-zA-Z0-9-]+)?/?$', 'index', name="kiosk-index"),
        url(r'^_loc/(?P<page>[a-zA-Z0-9-]+)/?$', 'loc_data', name="kiosk-loc-data"),
        url(r'^_popup/(?P<page>[a-zA-Z0-9-]+)/?$', 'popup_data', name="kiosk-popup-data"),
        url(r'^_links/?$', 'link_data', name="kiosk-link-data"),
        url(r'^_update_page_background/(?P<page>[a-zA-z0-9-]+)/?$', 'update_page_background', name='update-page-background'),
        url(r'^_kiosk_item/(?P<item>[a-zA-z0-9-]+)?/?$', 'kiosk_item', name='kiosk-item'),
)
