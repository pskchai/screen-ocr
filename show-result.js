ObjC.import('AppKit');

ObjC.registerSubclass({
    name: 'OCRResultWindow',
    superclass: 'NSWindow',
    methods: {
        canBecomeKeyWindow: {
            types: ['bool', []],
            implementation: function () { return true; }
        },
        'copyResult:': {
            types: ['void', ['id']],
            implementation: function () { $.NSApp.stopModalWithCode(1); }
        },
        'cancelOperation:': {
            types: ['void', ['id']],
            implementation: function () { $.NSApp.stopModalWithCode(0); }
        }
    }
});

function setPillHover(pill, hovered) {
    if (ObjC.unwrap(pill.identifier) === 'primary') {
        pill.fillColor = pill.fillColor.colorWithAlphaComponent(hovered ? 0.28 : 0.20);
        return;
    }
    var dark = Number(pill.fillColor.whiteComponent) > 0.5;
    pill.fillColor = pill.fillColor.colorWithAlphaComponent(hovered
        ? (dark ? 0.16 : 0.14)
        : (dark ? 0.10 : 0.08));
}

ObjC.registerSubclass({
    name: 'OCRButtonPill',
    superclass: 'NSBox',
    methods: {
        'mouseEntered:': {
            types: ['void', ['id']],
            implementation: function () { setPillHover(this, true); }
        },
        'mouseExited:': {
            types: ['void', ['id']],
            implementation: function () { setPillHover(this, false); }
        }
    }
});

function run(argv) {
    var text = $.NSString.stringWithContentsOfFileEncodingError(
        argv[0], $.NSUTF8StringEncoding, null
    );
    if (!text) {
        throw new Error('Cannot read OCR result');
    }

    var app = $.NSApplication.sharedApplication;
    app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);

    var screenFrame = $.NSScreen.mainScreen.visibleFrame;
    var screen = screenFrame.size;
    var font = $.NSFont.systemFontOfSize(14);
    var attributes = $.NSDictionary.dictionaryWithObjectForKey(font, $.NSFontAttributeName);
    var longestLine = 0;
    ObjC.unwrap(text).split(/\r\n|\r|\n/).forEach(function (line) {
        longestLine = Math.max(longestLine, $(line).sizeWithAttributes(attributes).width);
    });
    var width = Math.ceil(Math.min(Math.max(360, longestLine + 40), 520, screen.width * 0.8));
    var textWidth = width - 40;

    var view = $.NSTextView.alloc.initWithFrame($.NSMakeRect(0, 0, textWidth, 44));
    view.editable = false;
    view.selectable = true;
    view.richText = false;
    view.drawsBackground = false;
    view.focusRingType = $.NSFocusRingTypeNone;
    view.font = font;
    view.textColor = $.NSColor.labelColor;
    view.textContainerInset = $.NSMakeSize(0, 0);
    view.verticallyResizable = true;
    view.horizontallyResizable = false;
    view.autoresizingMask = $.NSViewWidthSizable;
    view.textContainer.widthTracksTextView = true;
    view.textContainer.lineFragmentPadding = 0;
    view.textContainer.size = $.NSMakeSize(textWidth, 10000000);
    var paragraph = $.NSMutableParagraphStyle.alloc.init;
    paragraph.lineSpacing = 4;
    view.defaultParagraphStyle = paragraph;
    view.string = text;
    view.layoutManager.ensureLayoutForTextContainer(view.textContainer);
    var textHeight = Math.ceil(view.layoutManager.usedRectForTextContainer(view.textContainer).size.height);
    var bodyHeight = Math.min(Math.max(44, textHeight), 480, Math.floor(screen.height * 0.75) - 78);
    var height = bodyHeight + 78;

    var window = $.OCRResultWindow.alloc.initWithContentRectStyleMaskBackingDefer(
        $.NSMakeRect(0, 0, width, height), $.NSWindowStyleMaskBorderless,
        $.NSBackingStoreBuffered, false
    );
    window.opaque = false;
    window.backgroundColor = $.NSColor.clearColor;
    window.hasShadow = true;
    window.movableByWindowBackground = true;
    var glass = $.NSGlassEffectView.alloc.initWithFrame(window.contentView.bounds);
    glass.cornerRadius = 20;
    glass.focusRingType = $.NSFocusRingTypeNone;
    glass.wantsLayer = true;
    glass.clipsToBounds = true;
    glass.layer.cornerRadius = 20;
    glass.layer.masksToBounds = true;
    window.contentView = glass;
    var dark = ObjC.unwrap(app.effectiveAppearance.bestMatchFromAppearancesWithNames([
        ObjC.unwrap($.NSAppearanceNameAqua), ObjC.unwrap($.NSAppearanceNameDarkAqua)
    ])) === ObjC.unwrap($.NSAppearanceNameDarkAqua);
    var surface = $.NSBox.alloc.initWithFrame(glass.bounds);
    surface.boxType = $.NSBoxCustom;
    surface.borderWidth = 0;
    surface.titlePosition = $.NSNoTitle;
    surface.contentViewMargins = $.NSMakeSize(0, 0);
    surface.cornerRadius = 20;
    surface.fillColor = dark
        ? $.NSColor.colorWithWhiteAlpha(0, 0.40)
        : $.NSColor.colorWithWhiteAlpha(1, 0.55);
    glass.contentView = surface;
    var content = surface.contentView;

    var scroll = $.NSScrollView.alloc.initWithFrame($.NSMakeRect(20, 58, textWidth, bodyHeight));
    scroll.hasVerticalScroller = true;
    scroll.autohidesScrollers = true;
    scroll.borderType = $.NSNoBorder;
    scroll.drawsBackground = false;

    scroll.documentView = view;
    content.addSubview(scroll);

    var buttonFont = $.NSFont.systemFontOfSize(13);
    var buttonAttributes = $.NSDictionary.dictionaryWithObjectForKey(buttonFont, $.NSFontAttributeName);
    var copyWidth = Math.ceil($('Copy').sizeWithAttributes(buttonAttributes).width) + 24;
    var dismissWidth = Math.ceil($('Dismiss').sizeWithAttributes(buttonAttributes).width) + 24;
    var copy = $.NSButton.buttonWithTitleTargetAction('Copy', window, 'copyResult:');
    copy.frame = $.NSMakeRect(width - 20 - copyWidth, 12, copyWidth, 34);
    copy.keyEquivalent = '\r';
    copy.contentTintColor = $.NSColor.systemBlueColor;

    var dismiss = $.NSButton.buttonWithTitleTargetAction('Dismiss', window, 'cancelOperation:');
    dismiss.frame = $.NSMakeRect(width - 28 - copyWidth - dismissWidth, 12, dismissWidth, 34);
    dismiss.keyEquivalent = '\u001b';
    dismiss.contentTintColor = $.NSColor.colorWithWhiteAlpha(dark ? 0.70 : 0.35, 1);
    [copy, dismiss].forEach(function (button, index) {
        button.bordered = false;
        button.font = buttonFont;
        var pill = $.OCRButtonPill.alloc.initWithFrame(button.frame);
        pill.identifier = index === 0 ? 'primary' : 'cancel';
        pill.boxType = $.NSBoxCustom;
        pill.borderWidth = 0;
        pill.titlePosition = $.NSNoTitle;
        pill.contentViewMargins = $.NSMakeSize(0, 0);
        pill.cornerRadius = 17;
        pill.fillColor = index === 0
            ? $.NSColor.systemBlueColor.colorWithAlphaComponent(0.20)
            : $.NSColor.colorWithWhiteAlpha(dark ? 1 : 0, dark ? 0.10 : 0.08);
        button.frame = pill.contentView.bounds;
        pill.contentView.addSubview(button);
        var tracking = $.NSTrackingArea.alloc.initWithRectOptionsOwnerUserInfo(
            $.NSZeroRect,
            $.NSTrackingMouseEnteredAndExited | $.NSTrackingActiveInKeyWindow | $.NSTrackingInVisibleRect,
            pill, null
        );
        button.addTrackingArea(tracking);
        content.addSubview(pill);
    });
    window.defaultButtonCell = copy.cell;

    window.setFrameOrigin($.NSMakePoint(
        screenFrame.origin.x + (screen.width - width) / 2,
        screenFrame.origin.y + (screen.height - height) / 2
    ));
    app.activateIgnoringOtherApps(true);
    window.makeKeyAndOrderFront(null);
    var response = app.runModalForWindow(window);
    window.orderOut(null);
    return Number(response) === 1 ? 'Copy' : 'Dismiss';
}
