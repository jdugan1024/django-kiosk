from django.conf.urls.defaults import *

urlpatterns = patterns('kiosk.views',
        # index
        url(r'^(?P<page>[a-zA-Z0-9-]+)?/?$', 'index', name="kiosk-index"),
        url(r'^_loc/(?P<page_name>[a-zA-Z0-9-]+)(/(?P<pk>[0-9]+))?/?$', 'loc_data', name="kiosk-loc-data"),
        url(r'^_kiosk_item/((?P<item_type>[a-zA-Z0-9-]+)/(?P<item_name>[a-zA-z0-9-]+))?/?$', 'kiosk_item', name='kiosk-item'),
        url(r'^_kiosk_item_image/(?P<item_type>[a-zA-z0-9-]+)/(?P<item_name>[a-zA-z0-9-]+)/?$', 
        	'kiosk_item_image', name='kiosk-item-image'),
)
