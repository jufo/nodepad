(function() {
    
    // Easily get an item's database ID based on an id attribute
    $.fn.itemID = function() {
        try {
            var items = $(this).attr('id').split('-');
            return items[items.length - 1];
        } catch (exception) {
            return null;
        }
    };

    $.put = function(url, data, success) {
        data._method = 'PUT';
        $.post(url, data, success, 'json');
    };
    
    $('#delete-document').click(function(e) {
        e.preventDefault();
        var id = $('#document-list .selected').itemID(),
            href = $('#document-list .selected').attr('href');
        console.log('Delete: id ' + id + ' href ' + href);
        if (confirm('Are you sure?')) {
            var form = $('<form></form>');
            form.attr({ method: 'POST',
                        action: href })
                .hide()
                .append('<input type="hidden" />')
                .find('input')
                .attr({ 'name': '_method', 'value': 'delete' })
                .end()
                .appendTo('body')
                .submit();
        }
    });

    // Correct widths and heights based on window size
    function resize() {
        var height = $(window).height() - $('#header').height() - 1,
            width = $('.content').width(),
            ov = $('.outline-view'),
            ed = $('#editor'),
            toolbar = $('.toolbar'),
            divider = $('.content-divider'),
            content = $('.content'),
            controls = $('#controls');

        $('#DocumentTitles').css({ height: height - toolbar.height() + 'px' });
        ov.css({ height: height + 'px' });
        toolbar.css({ width: ov.width() + 'px' });

        content.css({
            height: height - controls.height() + 'px',
            width: $('body').width() - ov.width() - divider.width() - 1 + 'px'
        });

        divider.css({ height: height + 'px' });

        ed.css({
            width: content.width() - 5 + 'px',
            height: content.height() - 5 + 'px'
        }).focus();

        $('#controls').css({
          width: content.width() + 'px'
        });
    }

    $('#document-list li a').live('click', function(e) {
        var li = $(this);

        $.get(this.href + '.json', function(data) {
            $('#document-list .selected').removeClass('selected');
            li.addClass('selected');
            $('#editor').val(data.data);
            $('#editor').focus();
        });

        e.preventDefault();
    });

    if ($('#document-list .selected').length == 0) {
        $('#document-list li a').first().click();
    }

    $('#save-button').click(function() {
        var id = $('#document-list .selected').itemID(),
            params = { d: { data: $('#editor').val(), id: id } };
            
        $.put('/documents/' + id + '.json', params, function(data) {
            // Saved, will return JSON
        });
    });

    $(window).resize(resize);
    $(window).focus(resize);
    resize();
})();
