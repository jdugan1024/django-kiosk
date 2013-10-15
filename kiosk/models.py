import os

from django.db import models
from django.forms import ModelForm, ValidationError
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
    name = models.SlugField(max_length=256, unique=True)
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
        unique_together = (("name", "type"),)

    def __str__(self):
        return "%s %s" % (self.name, self.type)

    def serialize(self):
        d = {}
        d['id'] = self.name
        d['name'] = self.name
        d['title'] = self.title

        if self.type == 'page':
            if self.page_image:
                d['page_image'] = self.page_image.url
            else:
                d['page_image'] = ""
        else:
            d['url'] = self.url
            d['text'] = self.text
            if self.popup_image1: 
                d['popup_image1'] = self.popup_image1.url
            else:
                d['popup_image1'] = ""

            if self.popup_image2: 
                d['popup_image2'] = self.popup_image2.url
            else:
                d['popup_image2'] = ""
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

