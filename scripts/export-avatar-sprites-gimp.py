import json
import os
import re

from gi.repository import Gio, Gimp


EXPORT_SIZE = int(os.environ["POKER_AVATAR_EXPORT_SIZE"])


def normalize_name(name):
    return re.sub(r" #\d+$", "", name).strip().lower()


def find_item(items, name):
    normalized_name = normalize_name(name)
    for item in items:
        if normalize_name(item.get_name()) == normalized_name:
            return item
    raise RuntimeError(f"Missing XCF item: {name}")


def export_drawable(drawable, output_path):
    output = Gimp.Image.new(EXPORT_SIZE, EXPORT_SIZE, Gimp.ImageBaseType.RGB)
    canvas = Gimp.Layer.new(
        output,
        "Canvas",
        EXPORT_SIZE,
        EXPORT_SIZE,
        Gimp.ImageType.RGBA_IMAGE,
        0.0,
        Gimp.LayerMode.NORMAL,
    )
    output.insert_layer(canvas, None, 0)

    exported_layer = Gimp.Layer.new_from_drawable(drawable, output)
    exported_layer.set_visible(True)
    exported_layer.set_opacity(100.0)
    output.insert_layer(exported_layer, None, 0)
    _, offset_x, offset_y = drawable.get_offsets()
    exported_layer.set_offsets(offset_x, offset_y)

    Gimp.file_save(
        Gimp.RunMode.NONINTERACTIVE,
        output,
        Gio.File.new_for_path(output_path),
        None,
    )
    output.delete()


source_path = os.environ["POKER_AVATAR_EXPORT_SOURCE"]
tasks = json.loads(os.environ["POKER_AVATAR_EXPORT_TASKS"])
source = Gimp.file_load(
    Gimp.RunMode.NONINTERACTIVE,
    Gio.File.new_for_path(source_path),
)

for task in tasks:
    category = find_item(source.get_layers(), task["category"])
    style = (
        category
        if task["direct"]
        else find_item(category.get_children(), task["style"])
    )
    drawable = (
        find_item(style.get_children(), task["layer"])
        if task["layer"]
        else style
    )
    export_drawable(drawable, task["output"])

source.delete()
