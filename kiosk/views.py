import StringIO

from django.http import Http404, HttpResponseRedirect, HttpResponse, HttpResponseForbidden
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext

try:
    import json
except ImportError:
    import simplejson as json

from kiosk.models import KioskItem, KioskPageLinkLocation

def index(request, page=None):
    if not page:
        page = "index"

    page = get_object_or_404(KioskItem, name=page, type='page')

    return render_to_response('kiosk/index.html',
            {"page": page}, context_instance=RequestContext(request))

def loc_data(request, page):
    page = get_object_or_404(KioskItem, name=page, type='page')

    if request.method == 'POST':
        if not request.user.is_staff:
            return HttpResponseForbidden("Permission denied.")

        links = json.loads(str(request.POST['links']))
        page.link_locations.all().delete()
        for link in links:
            link['link'] = KioskItem.objects.get(name=link['link'][1:])
            link['page'] = page
            kpll = KioskPageLinkLocation(**link)
            kpll.save()

        r = json.dumps(dict(status="OK"))
    elif request.method == 'GET':
        l = []
        for lo in page.link_locations.all():
            if lo.link.type == "page":
                link = "/" + lo.link.name
            else:
                link = "#" + lo.link.name
            l.append(dict(top=lo.top,left=lo.left,width=lo.width,height=lo.height,link=link))
        r = json.dumps(l)
    else:
        return Http404()

    return HttpResponse(r)

def popup_data(request, page):
    page = get_object_or_404(KioskItem, name=page, type='popup')

    if request.method == 'POST':
        print json.dumps(json.loads(request.POST['links']), indent=4)
        return Http404()
    elif request.method == 'GET':
        return render_to_response('kiosk/popup.html',
            {"page": page}, context_instance=RequestContext(request))
    else:
        return Http404()

    return HttpResponse(r)

def link_data(request):
    items = KioskItem.objects.order_by("name").all()
    l = []
    for item in items:
        if item.type == 'page':
            l.append(('/' + item.name, item.name))
        else:
            l.append(('#' + item.name, item.name))

    return HttpResponse(json.dumps(l))
