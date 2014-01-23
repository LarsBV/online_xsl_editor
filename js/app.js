/*************** Create xslWindow function ***********/
(function( $ ) {
$.fn.xslWindow = function(options) {
    var settings = $.extend({}, options || {} );
    
    this.each(function() {
        var container = $('<div>').addClass('xslWindow').appendTo($(this).addClass('xslWindow_content').parent()).append(this);
        var helper = $('<div>').appendTo(container).addClass('xslWindow_title');
        var helper_content = $('<div>').appendTo(helper).addClass('xslWindow_title_content');
        if(options.title)
            helper.html('<h6>' + options.title + '</h6>');
        
        var overview = $('#overview_' + $(this).attr('id')).get(0);
        container = container.add(overview);
        container.css('position', 'absolute');
        if(options.width !== undefined)
            container.css('width', options.width);
        if(options.height !== undefined)
            container.css('height', options.height);
        if(options.top !== undefined)
            container.css('top', options.top);
        if(options.left !== undefined)
            container.css('left', options.left);
        if(options.bottom !== undefined)
            container.css('bottom', options.bottom);
        if(options.right !== undefined)
            container.css('right', options.right);
        container = container.not(overview);
        
        container
        .draggable({
            snap: true,
            containment: 'document',
            handle: helper.get(0)
        })
        .resizable({
            snap: true,
            handles: "n, e, s, w",
            containment: 'document',
            resizeStop: options.editor ? function() {options.editor.resize();} : undefined
        });

        var height = parseInt(helper.css('height'));

        helper.on('mouseenter.xslWindow', function() {
            if(helper_content.children().length === 0)
                return;
            helper.delay(200).animate({
                queue:false,
                height: helper_content.get(0).scrollHeight + height*2
                });
        });
        helper.on('mouseleave.xslWindow', function() {
            helper.delay(100).animate({
                queue:false,
                height: height
                });
        });
    })

    return this;
}})(jQuery);

/************ Helper functions *******************/
/* These functions takes an xslWindow element ID */
/*************************************************/
function add_select(e, cb) {
    var target = $(e).parent().find('.xslWindow_title_content').get(0);
    var file = $('<input>', {type: 'file'}).hide().appendTo($(target).parent());
    add_button(e).val('Open').click(function() {
        file.trigger('click');
    });
    file.on('change', function() {
        var reader = new FileReader();
        
        if(!file.get(0).files[0])
            return;
        
        reader.onload = function(e) {
            cb(file.get(0).files[0].name, e.target.result);
        }
        reader.readAsText(file.get(0).files[0]);
    });
};
function add_button(e) {
        
    var target = $(e).parent().find('.xslWindow_title_content').get(0);
    var button = $('<input>', {type: 'button', value: ''}).appendTo(target);
    
    return button;
};

/********************** Application start  ***************************/

$(function() {
    var parser = new DOMParser();
    
    /********************** Setup Editors ***************************/
    var langTools = ace.require("ace/ext/language_tools");
    langTools.addCompleter(xslCompleter);
    
    var editor = ace.edit("editor");
    editor.name = "Transform";
    editor.filename = 'transform.xsl';
    editor.parsed = undefined;
    editor.setTheme("ace/theme/github");
    editor.getSession().setMode("ace/mode/xml");
    editor.setOptions({enableBasicAutocompletion: true});
    
    var testcase = ace.edit("testcase");
    testcase.name = "Testcase";
    testcase.parsed = undefined;
    testcase.filename = 'testcase.xml';
    testcase.setTheme("ace/theme/github");
    testcase.getSession().setMode("ace/mode/xml");

    var preview = ace.edit("preview");
    preview.name = "Preview";
    preview.setTheme("ace/theme/github");
    preview.getSession().setMode("ace/mode/xml");
    
        
    editor.on('change', function() {
        editor.parsed = parser.parseFromString(editor.getSession().getValue(), "application/xml");
        
        // Autosave the contents
        sessionStorage.setItem("editor_autosave", editor.getSession().getValue());

        if(!parseError(editor.parsed.documentElement, editor))
            process();
    });
    testcase.on('change', function() {
        testcase.parsed = parser.parseFromString(testcase.getSession().getValue(), "application/xml");
        
        // Autosave the contents
        sessionStorage.setItem("testcase_autosave", testcase.getSession().getValue());

        if(!parseError(testcase.parsed.documentElement, testcase))
            process();
    });
    
    
    /************************* Setup GUI ****************************/
    $('#editor'       ).xslWindow({top: 0,         bottom: '50px', left: 0,     right: '50%'});
    $('#preview'      ).xslWindow({top: 0,         bottom: '40%',  left: '50%', right: 0    });
    $('#testcase'     ).xslWindow({top: '60%',     bottom: '50px', left: '50%', right: 0    });
    $('#panel'        ).xslWindow({height: '50px', bottom: 0,      left: 0,     right: 0    });
    
    add_select('#editor', function(filename, content) {
        editor.filename = filename;
        sessionStorage.setItem("editor.filename", editor.filename);
        editor.getSession().setValue(vkbeautify.xml(content));
    });
    
    add_select('#testcase', function(filename, content) {
        testcase.getSession().setValue(vkbeautify.xml(content));
        testcase.filename = filename;
        sessionStorage.setItem("testcase.filename", testcase.filename);
    });
    
    [{window: '#preview',  editor: preview,  filename: 'preview.xml'},
        {window: '#editor',   editor: editor,   filename: editor.filename   || ''},
        {window: '#testcase', editor: testcase, filename: testcase.filename || ''}].forEach(function(e) {
        add_button(e.window).val('Save').click(function() {
            var link = $('<a>', {
                            href: 'data:text/xml;charset=utf-8,' + encodeURIComponent(e.editor.getSession().getValue()), 
                            download: e.filename
                        }).appendTo( $(e.window).parent().find('.xslWindow_title')).hide();
            link[0].click(); // uses native click function
            link.remove();
        });
    });
        
    
    /************************ Load Session *************************/
    if ( sessionStorage.getItem("editor_autosave")) {
        // Restore
        editor.getSession().setValue(sessionStorage.getItem("editor_autosave"));
        testcase.getSession().setValue(sessionStorage.getItem("testcase_autosave"));
        editor.filename = sessionStorage.getItem("editor.filename");
        testcase.filename = sessionStorage.getItem("testcase.filename");
    }
    else {
        editor.getSession().setValue(
                '<?xml version="1.0" encoding="UTF-8"?>                 \n'
            + '<xsl:stylesheet version="1.0"                          \n'
            + '    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">  \n'
            + '                                                       \n'
            + '    <xsl:template match="/test">                       \n'
            + '    <output>                                           \n'
            + '            <xsl:apply-templates />                    \n'
            + '    </output>                                          \n'
            + '    </xsl:template>                                    \n'
            + '</xsl:stylesheet>                                      \n'                        
            );
        editor.filename = 'transform.xsl';
        testcase.getSession().setValue(
                '<?xml version="1.0" encoding="UTF-8"?>                        \n'                 
            + '<test xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> \n'
            + '   <case>test</case>                                         \n'                       
            + '</test>                                                      \n'
            );
        testcase.filename = 'testcase.xml';
    }
    

    
    function process() {
        if(!(testcase.parsed && editor.parsed)) {
            $('#panel').html('Missing ' + (testcase.parsed ? 'Transform':'Test case'));
            return;
        }
        
        
        try {
            var processor = new XSLTProcessor();
            processor.importStylesheet(editor.parsed);
            var doc = processor.transformToDocument(testcase.parsed);
            if(!doc) {
                preview.getSession().setValue('Some kind of problem in the xsl transformation');
                return;
            }
            if(doc.documentElement.nodeName === 'transformiix:result') {
                if(!parseError(doc.documentElement, testcase))
                    return;
            }
        }
        catch(e) {
            console.log(e);
            return;
        }
        var result = vkbeautify.xml(doc.documentElement.outerHTML);
        preview.getSession().setValue(result);
    }
    
    function parseError(data, target) {
        // Find a name for the window with a error
        var name = target.name; // $(target.container).parent().find('.xslWindow_title>*:not(input,button)'
        
        // Assume there is no errors
        target.getSession().clearAnnotations();
        $(target.container).parent().removeClass('error');
        // remove the jump to error function
        $('#panel').text('').off('click.jumpto');
        
        // Detect the precense of a error message
        if(data.firstChild.nodeName === 'parsererror' || data.nodeName === 'parsererror' || data.nodeName === 'transformiix:result') {
            data = data.innerHTML;
        }
        else if(data.getElementsByTagName('parsererror').length !== 0) {
            data = $(data.getElementsByTagName('parsererror')[0]).find('div').html();
            console.log('per' + data);
        }
        else {
            return false;
        }   
        
        // Try and parse the error message
        var found = data.match(/error on line ([0-9]+) at column ([0-9]+): (.*)/); // Webkit
        var row, column, text;
        if(!found) {
            found = data.match(/XML Parsing Error: (.*?)\nLocation:.*\nLine Number ([0-9]+), Column ([0-9]+):(.*)/); // Gecko
            if(!found) {
                row = '1';
                column = '1';
                // Maybe there is no error but a missing enclosing element, so mozilla puts a <transformiix:result> tag around
                text = 'Have you forgotten an enclosing element in output? else I don\'t know what. sry.';
                console.log('no match');
            }
            else {
                row = found[2];
                column = found[3];
                text = found[1];
            }
        }
        else {
            row = found[1];
            column = found[2];
            text = found[3];
        }
        
        // Mark the window as having a error
        $(target.container).parent().addClass('error');
        
        // Variable to hold old cursor position
        var oldPos = {row: row, column: column, selection: []};

        var mesg = "name + ' line ' + row + ' column ' + column + ' error: ' + text";
        $('#panel').html(mesg).on('click.jumpto',
            function() { 
                /* Enabling click to jump to and back from error message */
                var currentPos = target.getCursorPosition();
                currentPos.selection = target.selection.getAllRanges();
                target.navigateTo(oldPos.row, oldPos.column);
                oldPos.selection.forEach(function(r) {
                    target.selection.addRange(r);
                });
                target.centerSelection();
                oldPos = currentPos;
        });
                
        // Mark the line with an error.
        target.getSession().setAnnotations([{
            row: row - 1,
            column: column,
            text: text,
            type: "error"
        }]);
        return true;
    }
            
            
    /* Show welcome screen */
    $( "#welcome" ).dialog({
        modal: true,
        height: window.innerHeight * 0.70,
        width: window.innerWidth * 0.85,
    });
});