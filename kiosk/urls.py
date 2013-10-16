from django.conf.urls.defaults import *

urlpatterns = patterns('kiosk.views',
        # index
        url(r'^(?P<page>[a-zA-Z0-9-]+)?/?$', 'index', name="kiosk-index"),
        url(r'^_loc/(?P<page_name>[a-zA-Z0-9-]+)(/(?P<pk>[0-9]+))?/?$', 'loc_data', name="kiosk-loc-data"),
        url(r'^_popup/(?P<page>[a-zA-Z0-9-]+)/?$', 'popup_data', name="kiosk-popup-data"),
        url(r'^_links/?$', 'link_data', name="kiosk-link-data"),
        url(r'^_update_page_background/(?P<page>[a-zA-z0-9-]+)/?$', 'update_page_background', name='update-page-background'),
        url(r'^_kiosk_item/((?P<item_type>[a-zA-Z0-9-]+)/(?P<item_name>[a-zA-z0-9-]+))?/?$', 'kiosk_item', name='kiosk-item'),
#        url(r'^_kiosk_page/(?P<page>[a-zA-z0-9-]+)?/?$', 'kiosk_page', name='kiosk-page'),
#        url(r'^_kiosk_popup/(?P<popup>[a-zA-z0-9-]+)?/?$', 'kiosk_popup', name='kiosk-popup'),
        url(r'^_update_kiosk_item_image/(?P<item_type>[a-zA-z0-9-]+)/(?P<item_name>[a-zA-z0-9]+)/?$', 
        	'update_kiosk_item_image', name='update-kiosk-item-image'),
)
