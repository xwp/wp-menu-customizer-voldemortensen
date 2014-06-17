/*
 * Menu Customizer JS. Most if not all of this will be moved to the backbonified menu-customizer.js.
 * Screen options will likely be the only thing that stays here.
 */

// Global ajaxurl, 
(function($) {
	var customizeMenus = {
		init : function() {
/*
			// Toggle menu item settings.
			$('.menu-item-handle').click( function() {
				item     = $(this).parent().parent();
				settings = $(this).parent().next('.menu-item-settings');

				if( 0 !== item.length ) {
					if( item.hasClass('menu-item-edit-inactive') ) {
						// Collapse all other menu items.
						open = item.parent().parent().find( '.menu-item-edit-active' ),
						open.removeClass( 'menu-item-edit-active' )
							.addClass('menu-item-edit-inactive');
						open.find( '.menu-item-settings' ).slideUp('fast');
						settings.slideDown('fast');
						item.removeClass('menu-item-edit-inactive')
							.addClass('menu-item-edit-active');
					} else {
						settings.slideUp('fast');
						item.removeClass('menu-item-edit-active')
							.addClass('menu-item-edit-inactive');
					}
				}
			} );

			// Make menu items sortable.
			// Actually implementing this will require porting a lot of special handling from nav-menu.js (particularly for sub-menu items).
			$( 'li[id^="accordion-section-nav_menu"] .accordion-section-content' ).sortable( {
				handle: '.menu-item-handle',
				placeholder: 'sortable-placeholder',
				items: '.nav-menu-item-wrap',
				axis: 'y',
			} );
*/
			// Add a temporary screen options button. This will likely end up living somewhere in the super-section header.
			var button = '<a id="customizer-menu-screen-options-button" title="Menu Options" href="#"></a>';
			// Use the menu locations section for now.
			var firstmenu = $( '#accordion-section-nav' );
			firstmenu.find( '.accordion-section-title' ).append( button );
			$( '#screen-options-wrap' ).appendTo( firstmenu );
			$( '#customize-control-menu_customizer_options' ).remove();
			$( '#screen-options-wrap' ).removeClass( 'hidden' );
			$( '#customizer-menu-screen-options-button' ).click( function() {
				$( '#customizer-menu-screen-options-button' ).toggleClass( 'active' );
				$( '#screen-options-wrap' ).toggleClass( 'active' );
				return false;
			} );

			// Update Section Title as nav menu name is changed.
			$( 'li[id^="accordion-section-nav_menu"] .customize-control-text input' ).bind( 'input', function() {
				var name = 'Menu: ' + $(this).val();
				$(this).parent().parent().parent().prev('h3').html(name); // @TODO make this less ridiculous.
			} );
		}
	}

	// Show/hide/save screen options (columns). From common.js.
	var columns = {
		init : function() {
			var that = this;
			$('.hide-column-tog').click( function() {
				var $t = $(this), column = $t.val();
				if ( $t.prop('checked') ) {
					that.checked(column);
				}
				else {
					that.unchecked(column);
				}

				that.saveManageColumnsState();
			});
			$( '.hide-column-tog' ).each( function() {
			var $t = $(this), column = $t.val();
				if ( $t.prop('checked') ) {
					that.checked(column);
				}
				else {
					that.unchecked(column);
				}
			} );
		},

		saveManageColumnsState : function() {
			var hidden = this.hidden();
			$.post(ajaxurl, {
				action: 'hidden-columns',
				hidden: hidden,
				screenoptionnonce: $('#screenoptionnonce').val(),
				page: 'nav-menus'
			});
		},

		checked : function(column) {
			$('.field-' + column).show();
		},

		unchecked : function(column) {
			$('.field-' + column).hide();
		},

		hidden : function() {
			this.hidden = function(){
				return $('.hide-column-tog').not(':checked').map(function() {
					var id = this.id;
					return id.substring( id, id.length - 5 );
				}).get().join(',');
			};
		},
	};

	$( document ).ready( function() {
		columns.init();
		customizeMenus.init();
	} );

})(jQuery);