from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


def test_project_delete_button_is_inside_dropdown_markup():
    html = (ROOT_DIR / "static" / "index.html").read_text(encoding="utf-8")

    dropdown_start = html.index('id="projectDropdownMenu"')
    dropdown_end = html.index('id="addProjectBtn"')
    dropdown_markup = html[dropdown_start:dropdown_end]

    assert 'id="projectDropdownButton"' in html
    assert 'id="projectOptionsList"' in dropdown_markup
    assert 'id="renameProjectBtn"' in dropdown_markup
    assert 'id="deleteProjectBtn"' in dropdown_markup
    assert 'id="projectSelect"' not in html


def test_project_action_buttons_close_dropdown_before_action():
    script = (ROOT_DIR / "static" / "js" / "main.js").read_text(encoding="utf-8")

    rename_listener_start = script.index('elements.renameProjectBtn.addEventListener("click"')
    rename_listener_end = script.index("});", rename_listener_start)
    rename_listener_body = script[rename_listener_start:rename_listener_end]
    listener_start = script.index('elements.deleteProjectBtn.addEventListener("click"')
    listener_end = script.index("});", listener_start)
    listener_body = script[listener_start:listener_end]

    assert "closeProjectDropdown();" in rename_listener_body
    assert "renameCurrentProject();" in rename_listener_body
    assert "closeProjectDropdown();" in listener_body
    assert "deleteCurrentProject();" in listener_body
