from django.contrib import admin
from kiosk.models import KioskItem, KioskPageLinkLocation

class KioskItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'page_image', 'popup_image1',
            'popup_image2', 'url']

class KioskPageLinkLocationAdmin(admin.ModelAdmin):
    list_display = ['page', 'link', 'left', 'top', 'width', 'height']

admin.site.register(KioskItem, KioskItemAdmin)
admin.site.register(KioskPageLinkLocation, KioskPageLinkLocationAdmin)
