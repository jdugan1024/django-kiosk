import os
import time

from django.db import models
from django.forms import ModelForm, ValidationError
from django.core.files.storage import FileSystemStorage
from django.conf import settings


def rename_wrapper(suffix=""):
    def rename(inst, filename):
        """Normalize file name.

        A timestamp in seconds since the epoch is appended to the filename to
        prevent any issues with caching."""
        r = ""
        if suffix == "":
            r = 'kiosk_%s/%s' % (inst.type, inst.name)
        else:
            r = 'kiosk_%s/%s__%s' % (inst.type, inst.name, suffix)

        ts = int(time.time() * 1000)
        return "{0}.{1}".format(r, ts)

    return rename

class KioskItem(models.Model):
    ITEM_TYPES = (
        ('page', 'Page'),
        ('popup', 'Popup'),
    )
    name = models.SlugField(max_length=256, unique=True)
    title = models.CharField(max_length=256, blank=True, null=True)
    type = models.CharField(max_length=8, choices=ITEM_TYPES)
 
    # only valid when type == 'page'
    page_image = models.ImageField(blank=True, null=True,
                                   upload_to=rename_wrapper())

    # only valid when type == 'popup'
    popup_image1 = models.ImageField(blank=True, null=True,
                                     upload_to=rename_wrapper(suffix="1"))
    popup_image2 = models.ImageField(blank=True, null=True,
                                     upload_to=rename_wrapper(suffix="2"))
    url = models.URLField(blank=True, null=True)
    text = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ('name', )
        unique_together = (("name", "type"),)

    def __str__(self):
        return "%s %s" % (self.name, self.type)

    @property
    def backbone_id(self):
        return "/".join((self.type, self.name))

    def serialize(self):
        d = {}

        d['id'] = self.backbone_id
        d['name'] = self.name
        d['title'] = self.title
        d['type'] = self.type

        if self.page_image:
            d['page_image'] = self.page_image.url
        else:
            d['page_image'] = None
        d['url'] = self.url
        d['text'] = self.text
        if self.popup_image1:
            d['popup_image1'] = self.popup_image1.url
        else:
            d['popup_image1'] = None

        if self.popup_image2:
            d['popup_image2'] = self.popup_image2.url
        else:
            d['popup_image2'] = None

        return d


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

    @property
    def backbone_id(self):
        return "/".join((self.page.name, str(self.pk)))

    def serialize(self):
        d = {}

        d['id'] = self.backbone_id
        d['top'] = self.top
        d['left'] = self.left
        d['width'] = self.width
        d['height'] = self.height
        d['link'] = self.link.backbone_id
        d['name'] = self.link.name
        d['type'] = self.link.type
        d['page'] = self.page.name

        return d

# --- Forms for the models above

class KioskItemForm(ModelForm):
    class Meta:
        model = KioskItem

    def clean(self):
        cleaned_data = super(KioskItemForm, self).clean()

        item_type = cleaned_data.get('type')
        if item_type == 'page':
            pass
        elif item_type == 'popup':
            img1 = cleaned_data.get('popup_image1')
            img2 = cleaned_data.get('popup_image2')
            if img1 is None and img2 is None:
                raise ValidationError("Must have at least one image")

        if cleaned_data.get('text') is None:
            raise ValidationError("Must supply text")

        return cleaned_data


class KioskPageLinkLocationForm(ModelForm):
    class Meta:
        model = KioskPageLinkLocation
