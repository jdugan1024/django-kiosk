import os

from django.db import models
from django.core.files.storage import FileSystemStorage
from django.conf import settings

def rename_wrapper(suffix=""):
    def rename(inst, filename):
        if suffix == "":
            return 'kiosk_%s/%s' % (inst.type, inst.name)
        else:
            return 'kiosk_%s/%s__%s' % (inst.type, inst.name, suffix)

    return rename

class OverwriteStorage(FileSystemStorage):
    def get_available_name(self, name):
        """just overwrite the file, don't preserve it"""
        print "we got name {0}".format(name)
        if self.exists(name):
            backup = os.path.join(settings.MEDIA_ROOT, name + ".last")
            os.rename(os.path.join(settings.MEDIA_ROOT, name), backup)
        return name

class KioskItem(models.Model):
    ITEM_TYPES = (
            ('page', 'Page'),
            ('popup', 'Popup'),
            )
    name = models.SlugField(max_length=256)
    title = models.CharField(max_length=256, blank=True, null=True)
    type = models.CharField(max_length=8, choices=ITEM_TYPES)
   
    # only valid when type == 'page'
    page_image = models.ImageField(blank=True, null=True,
            upload_to=rename_wrapper(), storage=OverwriteStorage())

    # only valid when type == 'popup'
    popup_image1 = models.ImageField(blank=True, null=True, 
            upload_to=rename_wrapper(suffix="1"), storage=OverwriteStorage())
    popup_image2 = models.ImageField(blank=True, null=True, 
            upload_to=rename_wrapper(suffix="2"), storage=OverwriteStorage())
    url = models.URLField(blank=True, null=True)
    text = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ('name', )

    def __str__(self):
        return "%s %s" % (self.name, self.type)

class KioskPageLinkLocation(models.Model):
    top = models.IntegerField()
    left = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
    page = models.ForeignKey("KioskItem", related_name="link_locations")
    link = models.ForeignKey("KioskItem", related_name="linked_pages")

    class Meta:
        ordering = ('page__name', 'link__name', 'left', 'top')

    def __str__(self):
        return "%s -> %s" % (self.page.name, self.link.name)

