/* global _wpCustomizeMenusSettings */
(function( wp, $ ){

	if ( ! wp || ! wp.customize ) { return; }

	// Set up our namespace.
	var api = wp.customize;

	api.Menus = api.Menus || {};

	// Link settings.
	api.Menus.data = _wpCustomizeMenusSettings || {};

	/**
	 * wp.customize.Menus.MenuItemModel
	 *
	 * A single menu item model.
	 *
	 * @constructor
	 * @augments Backbone.Model
	 */
	api.Menus.MenuItemModel = Backbone.Model.extend({
		transport: 'refresh',
		params: [],
		menu_item_id: null,
		original_id: 0,
		menu_id: 0,
		depth: 0,
		type: 'menu_item',
	});

	/**
	 * wp.customize.Menus.AvailableItemModel
	 *
	 * A single available menu item model.
	 *
	 * @constructor
	 * @augments Backbone.Model
	 */
	api.Menus.AvailableItemModel = Backbone.Model.extend({
		id: null,
		name: null,
		type: null,
		type_label: null,
		obj_type: null,
		date: null,
	});

	/**
	 * wp.customize.Menus.AvailableItemCollection
	 *
	 * Collection for available menu item models.
	 *
	 * @constructor
	 * @augments Backbone.Model
	 */
	api.Menus.AvailableItemCollection = Backbone.Collection.extend({
		model: api.Menus.AvailableItemModel,

		sort_key: 'order',

		comparator: function( item ) {
			return -item.get( this.sort_key );
		},

		sortByField: function( fieldName ) {
			this.sort_key = fieldName;
			this.sort();
		},

		// Controls searching on the current menu item collection.
		doSearch: function( value ) {

			// Don't do anything if we've already done this search.
			// Useful because the search handler fires multiple times per keystroke.
			if ( this.terms === value ) {
				return;
			}

			// Updates terms with the value passed.
			this.terms = value;

			// If we have terms, run a search.
			if ( this.terms.length > 0 ) {
				this.search( this.terms );
			}

			// If search is blank, show all items.
			// Useful for resetting the views when you clean the input.
			if ( this.terms === '' ) {
				this.each( function ( menu_item ) {
					menu_item.set( 'search_matched', true );
				} );
			}
		},

		// Performs a search within the collection.
		// @uses RegExp
		// @todo: this algorithm is slow and doesn't work; also, sort results by relevance.
		// (was based on widget filtering, which is an entirely different use-case).
		// Maybe look at the internal links search methods for inspiration, per @nacin.
		search: function( term ) {
			var match, haystack;

			// Escape the term string for RegExp meta characters.
			term = term.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );

			// Consider spaces as word delimiters and match the whole string
			// so that matching terms can be combined.
			term = term.replace( / /g, ')(?=.*' );
			match = new RegExp( '^(?=.*' + term + ').+', 'i' );

			this.each( function ( data ) {
				haystack = data.get( 'title' );
				data.set( 'search_matched', match.test( haystack ) );
			} );
		}
	});
	api.Menus.availableMenuItems = new api.Menus.AvailableItemCollection( api.Menus.data.availableMenuItems );

	/**
	 * wp.customize.Menus.MenuModel
	 *
	 * A single menu model.
	 *
	 * @constructor
	 * @augments Backbone.Model
	 */
	api.Menus.MenuModel = Backbone.Model.extend({
		id: null,
	});

	/**
	 * wp.customize.Menus.MenuCollection
	 *
	 * Collection for menu models.
	 *
	 * @constructor
	 * @augments Backbone.Collection
	 */
	api.Menus.MenuCollection = Backbone.Collection.extend({
		model: api.Menus.MenuModel
	});
	api.Menus.allMenus = new api.Menus.MenuCollection( api.Menus.data.allMenus );

	/**
	 * wp.customize.Menus.AvailableMenuItemsPanelView
	 *
	 * View class for the available menu items panel.
	 *
	 * @constructor
	 * @augments wp.Backbone.View
	 * @augments Backbone.View
	 */
	api.Menus.AvailableMenuItemsPanelView = wp.Backbone.View.extend({

		el: '#available-menu-items',

		events: {
			'input #menu-items-search': 'search',
			'keyup #menu-items-search': 'search',
			'change #menu-items-search': 'search',
			'search #menu-items-search': 'search',
			'focus .menu-item-tpl' : 'focus',
			'click .menu-item-tpl' : '_submit',
			'keypress .menu-item-tpl' : '_submit',
			'click #custom-menu-item-submit' : '_submitLink',
			'keypress #custom-menu-item-name' : '_submitLink',
			'keydown' : 'keyboardAccessible'
		},

		// Cache current selected menu item.
		selected: null,

		// Cache menu control that opened the panel.
		currentMenuControl: null,
		$search: null,
		rendered: false,

		initialize: function() {
			var self = this;

			this.toggleLoading(true);

			this.$search = $( '#menu-items-search' );

			_.bindAll( this, 'close' );

			this.listenTo( this.collection, 'change', this.updateList );

			this.collection.sortByField( 'order' );

			if ( ! this.rendered ) {
				this.initList();
				this.rendered = true;
			}
			this.updateList();

			// If the available menu items panel is open and the customize controls are
			// interacted with (other than an item being deleted), then close the
			// available menu items panel.
			$( '#customize-controls' ).on( 'click keydown', function( e ) {
				var isDeleteBtn = $( e.target ).is( '.item-delete, .item-delete *' ),
				    isAddNewBtn = $( e.target ).is( '.add-new-menu-item, .add-new-menu-item *' );
				if ( $( 'body' ).hasClass( 'adding-menu-items' ) && ! isDeleteBtn && ! isAddNewBtn ) {
					self.close();
				}
			} );

			// Close the panel if the URL in the preview changes
			api.Menus.Previewer.bind( 'url', this.close );

			this.toggleLoading(false);
		},

		toggleLoading: function( tf ) {
			$( '.add-menu-item-loading' ).toggle( tf );
		},

		// Performs a search and handles selected menu item.
		search: function( event ) {
			var firstVisible;

			this.collection.doSearch( event.target.value );

			// Remove a menu item from being selected if it is no longer visible.
			if ( this.selected && ! this.selected.is( ':visible' ) ) {
				this.selected.removeClass( 'selected' );
				this.selected = null;
			}

			// If a menu item was selected but the filter value has been cleared out, clear selection.
			if ( this.selected && ! event.target.value ) {
				this.selected.removeClass( 'selected' );
				this.selected = null;
			}

			// If a filter has been entered and a menu item hasn't been selected, select the first one shown.
			if ( ! this.selected && event.target.value ) {
				firstVisible = this.$el.find( '> .menu-item-tpl:visible:first' );
				if ( firstVisible.length ) {
					this.select( firstVisible );
				}
			}
		},

		// Render the individual items.
		initList: function() {
			var searchInner = $( '#available-menu-items-search .accordion-section-content' ),
				self = this,
				itemTemplate;
			_.templateSettings = {
				interpolate: /\{\{(.+?)\}\}/g
			};
			itemTemplate = _.template( api.Menus.data.tpl.availableMenuItem );

			// Render the template for each menu item in the search section.
			self.collection.each( function( menu_item ) {
				searchInner.append( itemTemplate({ data: menu_item.attributes }) );
			});

			// Render the template for each item by type.
			$.each( api.Menus.data.itemTypes, function( index, type ) {
				var items = self.collection.where({ type: type }),
					items = new api.Menus.AvailableItemCollection( items ),
					typeInner = $( '#available-menu-items-' + type + ' .accordion-section-content' );
				items.each( function( menu_item ) {
					typeInner.append( itemTemplate({ data: menu_item.attributes }) );
				} );
			} );
		},

		// Changes visibility of available menu items.
		updateList: function() {
			this.collection.each( function( menu_item ) {
				var menuitemTpl = $( '#menu-item-tpl-' + menu_item.id );
				menuitemTpl.toggle( menu_item.get( 'search_matched' ) );
				if ( ! menu_item.get( 'search_matched' ) && menuitemTpl.is( this.selected ) ) {
					this.selected = null;
				}
			} );
		},

		// Highlights a meun item.
		select: function( menuitemTpl ) {
			this.selected = $( menuitemTpl );
			this.selected.siblings( '.menu-item-tpl' ).removeClass( 'selected' );
			this.selected.addClass( 'selected' );
		},

		// Highlights a menu item on focus.
		focus: function( event ) {
			this.select( $( event.currentTarget ) );
		},

		// Submit handler for keypress and click on menu item.
		_submit: function( event ) {
			// Only proceed with keypress if it is Enter or Spacebar
			if ( event.type === 'keypress' && ( event.which !== 13 && event.which !== 32 ) ) {
				return;
			}

			this.submit( $( event.currentTarget ) );
		},

		// Adds a selected menu item to the menu.
		submit: function( menuitemTpl ) {
			var menuitemId, menu_item;

			if ( ! menuitemTpl ) {
				menuitemTpl = this.selected;
			}

			if ( ! menuitemTpl || ! this.currentMenuControl ) {
				return;
			}

			this.select( menuitemTpl );

			menuitemId = $( this.selected ).data( 'menu-item-id' );
			menu_item = this.collection.findWhere( { id: menuitemId } );
			if ( ! menu_item ) {
				return;
			}

			this.currentMenuControl.addItemToMenu( menu_item.attributes );
		},


		// Submit handler for keypress and click on custom menu item.
		_submitLink: function( event ) {
			// Only proceed with keypress if it is Enter.
			if ( event.type === 'keypress' && ( event.which !== 13 ) ) {
				return;
			}

			this.submitLink();
		},

		// Adds the custom menu item to the menu.
		submitLink: function() {
			var menu_item,
				item_name = $( '#custom-menu-item-name' ),
				item_url = $( '#custom-menu-item-url' );

			if ( ! this.currentMenuControl ) {
				return;
			}

			if ( '' === item_name.val() || '' === item_url.val() || 'http://' == item_url.val() ) {
				return;
			}

			menu_item = {
				'id': 0,
				'name': item_name.val(),
				'url': item_url.val(),
				'type': 'custom',
				'type_label': api.Menus.data.l10n.custom_label,
				'obj_type': 'custom'
			};

			this.currentMenuControl.addItemToMenu( menu_item );

			// Reset the custom link form.
			// @todo: decide whether this should be done as a callback after adding the item, as it is in nav-menu.js.
			item_url.val( 'http://' );
			item_name.val( '' );
		},

		// Opens the panel.
		open: function( menuControl ) {
			this.toggleLoading(true);
			this.currentMenuControl = menuControl;

			$( 'body' ).addClass( 'adding-menu-items' );

			// Collapse all controls.
			_( this.currentMenuControl.getMenuItemControls() ).each( function( control ) {
				control.collapseForm();
			} );

			// Move delete buttons into the title bar.
			_( this.currentMenuControl.getMenuItemControls() ).each( function( control ) {
				control.toggleDeletePosition( true );
			} );

			this.$el.find( '.selected' ).removeClass( 'selected' );

			// Reset search
			this.collection.doSearch( '' );

			this.$search.focus();
			this.toggleLoading(false);
		},

		// Closes the panel
		close: function( options ) {
			options = options || {};

			if ( options.returnFocus && this.currentMenuControl ) {
				this.currentMenuControl.container.find( '.add-new-menu-item' ).focus();
			}

			// Move delete buttons back to the title bar.
			_( this.currentMenuControl.getMenuItemControls() ).each( function( control ) {
				control.toggleDeletePosition( false );
			} );

			this.currentMenuControl = null;
			this.selected = null;

			$( 'body' ).removeClass( 'adding-menu-items' );

			this.$search.val( '' );
		},

		// Add keyboard accessiblity to the panel
		keyboardAccessible: function( event ) {
			var isEnter = ( event.which === 13 ),
				isEsc = ( event.which === 27 ),
				isDown = ( event.which === 40 ),
				isUp = ( event.which === 38 ),
				selected = null,
				firstVisible = this.$el.find( '> .menu-item-tpl:visible:first' ),
				lastVisible = this.$el.find( '> .menu-item-tpl:visible:last' ),
				isSearchFocused = $( event.target ).is( this.$search );

			if ( isDown || isUp ) {
				if ( isDown ) {
					if ( isSearchFocused ) {
						selected = firstVisible;
					} else if ( this.selected && this.selected.nextAll( '.menu-item-tpl:visible' ).length !== 0 ) {
						selected = this.selected.nextAll( '.menu-item-tpl:visible:first' );
					}
				} else if ( isUp ) {
					if ( isSearchFocused ) {
						selected = lastVisible;
					} else if ( this.selected && this.selected.prevAll( '.menu-item-tpl:visible' ).length !== 0 ) {
						selected = this.selected.prevAll( '.menu-item-tpl:visible:first' );
					}
				}

				this.select( selected );

				if ( selected ) {
					selected.focus();
				} else {
					this.$search.focus();
				}

				return;
			}

			// If enter pressed but nothing entered, don't do anything
			if ( isEnter && ! this.$search.val() ) {
				return;
			}

			if ( isEnter ) {
				this.submit();
			} else if ( isEsc ) {
				this.close( { returnFocus: true } );
			}
		}
	});

	/**
	 * wp.customize.Menus.MenuItemControl
	 *
	 * Customizer control for menu items.
	 * Note that 'menu_item' must match the WP_Menu_Item_Customize_Control::$type.
	 *
	 * @constructor
	 * @augments wp.customize.Control
	 */
	api.Menus.MenuItemControl = api.Control.extend({
		/**
		 * Set up the control.
		 */
		ready: function() {
			this._setupModel();
			this._setupControlToggle();
			this._setupReorderUI();
			this._setupUpdateUI();
			this._setupRemoveUI();
		},

		/**
		 * Handle changes to the setting.
		 */
		_setupModel: function() {
			var self = this, rememberSavedMenuItemId;

			api.Menus.savedMenuItemIds = api.Menus.savedMenuItemIds || [];

			// Remember saved menu items so that we know which to delete.
			rememberSavedMenuItemId = function() {
				api.Menus.savedMenuItemIds[self.params.menu_item_id] = true;
			};
			api.bind( 'ready', rememberSavedMenuItemId );
			api.bind( 'saved', rememberSavedMenuItemId );

			this._updateCount = 0;
			this.isMenuItemUpdating = false;

			// Update menu item whenever model changes.
			this.setting.bind( function( to, from ) {
				if ( ! _( from ).isEqual( to ) && ! self.isMenuItemUpdating ) {
					self.updateMenuItem( { instance: to } );
				}
			} );
		},

		/**
		 * Show/hide the settings when clicking on the menu item handle.
		 */
		_setupControlToggle: function() {
			var self = this;

			this.container.find( '.menu-item-handle' ).on( 'click', function( e ) {
				e.preventDefault();
				e.stopPropagation();
				var menuControl = self.getMenuControl();
				if ( menuControl.isReordering ) {
					return;
				}
				self.toggleForm();
			} );
		},

		/**
		 * Set up the menu-item-reorder-nav
		 */
		_setupReorderUI: function() {
			var self = this, selectMenu,
				$reorderNav, updateAvailableMenus;

			/**
			 * Add the menu item reordering elements to the menu item control.
			 */
			this.container.find( '.item-controls' ).after( $( api.Menus.data.tpl.menuitemReorderNav ) );

			/**
			 * Handle clicks for up/down/left-right on the reorder nav.
			 */
			$reorderNav = this.container.find( '.menu-item-reorder-nav' );
			$reorderNav.find( '.menus-move-up, .menus-move-down, .menus-move-left, .menu-move-right' ).on( 'click keypress', function( event ) {
				if ( event.type === 'keypress' && ( event.which !== 13 && event.which !== 32 ) ) {
					return;
				}
				$( this ).focus();

				var isMoveUp = $( this ).is( '.menus-move-up' ),
					isMoveDown = $( this ).is( '.menus-move-down' ),
					isMoveLeft = $( this ).is( '.menus-move-left' ),
					isMoveRight = $( this ).is( '.menus-move-right' ),
					i = self.getMenuItemPosition();

				if ( ( isMoveUp && i === 0 ) || ( isMoveDown && i === self.getMenuControl().setting().length - 1 ) ) {
					return;
				}

				if ( isMoveUp ) {
					self.moveUp();
				} else if ( isMoveDown ) {
					self.moveDown();
				} else if ( isMoveLeft ) {
					self.moveLeft();
				} else {
					self.moveRight();
				}

				$( this ).focus(); // Re-focus after the container was moved.
			} );
		},

		/**
		 * Set up event handlers for menu item updating.
		 */
		_setupUpdateUI: function() {
			var self = this, $menuItemRoot, $menuItemContent,
				updateMenuItemDebounced, formSyncHandler;

			$menuItemRoot = this.container.find( '.menu-item:first' );
			$menuItemContent = $menuItemRoot.find( '.menu-item-settings:first' );

			// Trigger menu item update when hitting Enter within an input.
			$menuItemContent.on( 'keydown', 'input', function( e ) {
				if ( 13 === e.which ) { // Enter
					e.preventDefault();
					self.updateMenuItem();
				}
			} );

			// Regular menu item update triggering - on change.
			$menuItemContent.on( 'change', ':input', function( e ) {
				self.updateMenuItem();
			} );
		},

		/**
		 * Set up event handlers for menu item deletion.
		 */
		_setupRemoveUI: function() {
			var self = this, $removeBtn;

			// Configure delete button.
			$removeBtn = this.container.find( 'a.item-delete' );
			$removeBtn.on( 'click', function( e ) {
				e.preventDefault();

				// Find an adjacent element to add focus to when this menu item goes away
				var $adjacentFocusTarget;
				if ( self.container.next().is( '.customize-control-menu_item' ) ) {
					$adjacentFocusTarget = self.container.next().find( '.item-edit:first' );
				} else if ( self.container.prev().is( '.customize-control-menu_item' ) ) {
					$adjacentFocusTarget = self.container.prev().find( '.item-edit:first' );
				} else {
					$adjacentFocusTarget = self.container.next( '.customize-control-menu' ).find( '.add-new-menu-items:first' );
				}

				self.container.slideUp( function() {
					var menuControl, menuItemIds, i;
					menuControl = api.Menus.getMenuControl( self.params.menu_id );

					if ( ! menuControl ) {
						return;
					}

					menuItemIds = menuControl.setting().slice();
					i = _.indexOf( menuItemIds, self.params.menu_item_id );
					if ( -1 === i ) {
						return;
					}

					menuItemIds.splice( i, 1 );
					menuControl.setting( menuItemIds );

					$adjacentFocusTarget.focus(); // keyboard accessibility
				} );
			} );
		},

		/***********************************************************************
		 * Begin public API methods
		 **********************************************************************/

		/**
		 * @return {wp.customize.controlConstructor.menus[]}
		 */
		getMenuControl: function() {
			var settingId, menuControl;

			settingId = 'nav_menus[' + this.params.menu_id + '][controls]';
			menuControl = api.control( settingId );

			if ( ! menuControl ) {
				return;
			}

			return menuControl;
		},

		/**
		 * Submit the menu item form via Ajax and get back the updated instance,
		 * along with the new menu item control form to render.
		 *
		 * @param {object} [args]
		 */
		updateMenuItem: function( args ) {
			var self = this, clone = 0, processing, inputs, item, params;
			// Check whether this menu item is cloned already; if not, let's clone it.
			// @todo after saving we'll need to re-clone; updating the original_id at that point should be sufficient, but need to make sure keeping the actual original id in the markup, setting, etc. is okay.
			if ( this.params.original_id === this.params.menu_item_id ) {
				clone = 1;
			}

			// Trigger processing states.
			self.container.addClass( 'saving' );
			processing = api.state( 'processing' );
			processing( processing() + 1 );

			// Get item.
			item = {};
			if ( 'undefined' === typeof args ) {
				inputs = $( self.container ).find( ':input[name]' );
				inputs.each( function() {
					var name = this.name;
					item[name] = $( this ).val();
				} );
			} else {
				item = args;
			}

			params = {
				'action': 'update-menu-item-customizer',
				'clone' : clone,
				'item_id': self.params.menu_item_id,
				'menu-item': item,
				'customize-menu-item-nonce': api.Menus.data.nonce
			};

			$.post( ajaxurl, params, function( id ) {
				var setting, menuControl, menuItemIds, i;
				if ( id && clone ) {
					// Update item control accordingly with new id.
					// Note that the id is only updated where necessary - the original id
					// is still maintained for the setting and in the UI.
					self.params.menu_item_id = id;
					self.id = 'nav_menus[' + self.params.menu_id + '][' + id + ']';

					//Replace original id of this item with cloned id in the menu setting.
					menuControl = api.Menus.getMenuControl( self.params.menu_id );

					menuItemIds = menuControl.setting().slice();
					i = _.indexOf( menuItemIds, self.params.original_id );

					menuItemIds[i] = parseInt( id, 10 );
					menuControl.setting( menuItemIds );
				}

				// Remove processing states.
				self.container.removeClass( 'saving' );
				processing( processing() - 1 );
			} );
		},

		/**
		 * Expand the accordion section containing a control
		 */
		expandControlSection: function() {
			var $section = this.container.closest( '.accordion-section' );

			if ( ! $section.hasClass( 'open' ) ) {
				$section.find( '.accordion-section-title:first' ).trigger( 'click' );
			}
		},

		/**
		 * Expand the menu item form control.
		 */
		expandForm: function() {
			this.toggleForm( true );
		},

		/**
		 * Collapse the menu item form control.
		 */
		collapseForm: function() {
			this.toggleForm( false );
		},

		/**
		 * Expand or collapse the menu item control.
		 *
		 * @param {boolean|undefined} [showOrHide] If not supplied, will be inverse of current visibility
		 */
		toggleForm: function( showOrHide ) {
			var self = this, $menuitem, $inside, complete;

			$menuitem = this.container.find( 'div.menu-item:first' );
			$inside = $menuitem.find( '.menu-item-settings:first' );
			if ( typeof showOrHide === 'undefined' ) {
				showOrHide = ! $inside.is( ':visible' );
			}

			// Already expanded or collapsed.
			if ( $inside.is( ':visible' ) === showOrHide ) {
				return;
			}

			if ( showOrHide ) {
				// Close all other menu item controls before expanding this one.
				api.control.each( function( otherControl ) {
					if ( self.params.type === otherControl.params.type && self !== otherControl ) {
						otherControl.collapseForm();
					}
				} );

				complete = function() {
					$menuitem.removeClass( 'menu-item-edit-inactive' )
							 .addClass( 'menu-item-edit-active' );
					self.container.trigger( 'expanded' );
				};

				$inside.slideDown( 'fast', complete );

				self.container.trigger( 'expand' );
			} else {
				complete = function() {
					$menuitem.addClass( 'menu-item-edit-inactive' )
							 .removeClass( 'menu-item-edit-active' );
					self.container.trigger( 'collapsed' );
				};

				self.container.trigger( 'collapse' );

				$inside.slideUp( 'fast', complete );
			}
		},

		/**
		 * Move the control's delete button up to the title bar or down to the control body.
		 *
		 * @param {boolean|undefined} [top] If not supplied, will be inverse of current visibility.
		 */
		toggleDeletePosition: function( top ) {
			var button, handle, actions;
			// @TODO: default handling.

			button = this.container.find( '.item-delete' );
			handle = this.container.find( '.menu-item-handle' );
			actions = this.container.find( '.menu-item-actions' );
			if ( top ) {
				handle.append( button );
			}
			else {
				actions.append( button );
			}
		},

		/**
		 * Expand the containing menu section, expand the form, and focus on
		 * the first input in the control.
		 */
		focus: function() {
			this.expandControlSection();
			this.expandForm();
			this.container.find( '.menu-item-settings :focusable:first' ).focus();
		},

		/**
		 * Get the position (index) of the item in the containing menu.
		 *
		 * @returns {Number}
		 */
		getMenuItemPosition: function() {
			var menuItemIds, position;

			menuItemIds = this.getMenuControl().setting();
			position = _.indexOf( menuItemIds, this.params.menu_item_id );

			if ( position === -1 ) {
				return;
			}

			return position;
		},

		/**
		 * Move menu item up one in the menu.
		 */
		moveUp: function() {
			// Update menu control setting.
			this._moveMenuItemByOne( -1 );
			// Update UI.
			var prev = $( this.container ).prev();
			prev.before( $( this.container ) );
			// Update parent if it's a sub-item.
			if ( 0 != this.params.depth ) {
				// @todo this.updateParent();
			}
			this.getMenuControl()._applyCardinalOrderClassNames();
		},

		/**
		 * Move menu item up one in the menu.
		 */
		moveDown: function() {
			// Update menu control setting.
			this._moveMenuItemByOne( 1 );
			// Update UI.
			var next = $( this.container ).next();
			next.after( $( this.container ) );
			// Maybe update parent if it's a sub-item.
			if ( 0 != this.params.depth ) {
				// @todo this.updateParent();
			}
			this.getMenuControl()._applyCardinalOrderClassNames();
		},
		/**
		 * Move menu item and all children up one level of depth.
		 */
		moveLeft: function() {
			this._moveMenuItemDepthByOne( -1 );
		},

		/**
		 * Move menu item and children one level deeper, as a submenu of the previous item.
		 */
		moveRight: function() {
			this._moveMenuItemDepthByOne( 1 );
		},

		/**
		 * @private
		 *
		 * @param {Number} offset 1|-1
		 */
		_moveMenuItemByOne: function( offset ) {
			var i, menuSetting, menuItemIds, adjacentMenuItemId;

			i = this.getMenuItemPosition();

			menuSetting = this.getMenuControl().setting;
			menuItemIds = Array.prototype.slice.call( menuSetting() ); // clone
			adjacentMenuItemId = menuItemIds[i + offset];
			menuItemIds[i + offset] = this.params.menu_item_id;
			menuItemIds[i] = adjacentMenuItemId;

			menuSetting( menuItemIds );
		},
	} );

	/**
	 * wp.customize.Menus.MenuControl
	 *
	 * Customizer control for menus.
	 * Note that 'nav_menu' must match the WP_Menu_Customize_Control::$type
	 *
	 * @constructor
	 * @augments wp.customize.Control
	 */
	api.Menus.MenuControl = api.Control.extend({
		/**
		 * Set up the control.
		 */
		ready: function() {
			this.$controlSection = this.container.closest( '.control-section' );
			this.$sectionContent = this.container.closest( '.accordion-section-content' );

			this._setupModel();
			this._setupSortable();
			this._setupAddition();
			this._setupDeletion();
			this._applyCardinalOrderClassNames();
		},

		/**
		 * Update ordering of menu item controls when the setting is updated.
		 * @todo this doesn't totally work
		 */
		_setupModel: function() {
			var self = this,
				menu = api.Menus.allMenus.get( this.params.menu_id );

			this.setting.bind( function( newMenuItemIds, oldMenuItemIds ) {
				var menuItemControls, $menuAddControl, finalControlContainers, removedMenuItemIds;

				removedMenuItemIds = _( oldMenuItemIds ).difference( newMenuItemIds );

				menuItemControls = _( newMenuItemIds ).map( function( menuItemId ) {
					var menuItemControl = api.Menus.getMenuItemControl( menuItemId );

					return menuItemControl;
				} );

				// Sort menu item controls to their new positions.
				menuItemControls.sort( function( a, b ) {
					var aIndex = _.indexOf( newMenuItemIds, a.params.menu_item_id ),
						bIndex = _.indexOf( newMenuItemIds, b.params.menu_item_id );

					if ( aIndex === bIndex ) {
						return 0;
					}

					return aIndex < bIndex ? -1 : 1;
				} );

				// Append the controls to put them in the right order
				finalControlContainers = _( menuItemControls ).map( function( menuItemControl ) {
					return menuItemControl.container;
				} );

				$menuAddControl = self.$sectionContent.find( '.customize-control-menu' );
				$menuAddControl.before( finalControlContainers );

				// Re-sort menu item controls.
				self._applyCardinalOrderClassNames();

				// Cleanup after menu item removal.
				_( removedMenuItemIds ).each( function( removedMenuItemId ) {
					var removedControl, removedId;

					removedControl = api.Menus.getMenuItemControl( removedMenuItemId );

					// Delete any menu item controls for removed items.
					if ( removedControl ) {
						api.control.remove( removedControl.id );
						removedControl.container.remove();
					}
				} );
			} );
		},

		/**
		 * Allow items in each menu to be re-ordered, and for the order to be previewed.
		 */
		_setupSortable: function() {
			var self = this;

			this.isReordering = false;

			/**
			 * Update menu item order setting when controls are re-ordered.

			 * @TODO: logic from nav-menu.js for sub-menu depths, etc.
			 */
			this.$sectionContent.sortable( {
				items: '> .customize-control-menu_item',
				handle: '.menu-item-handle',
				axis: 'y',
				connectWith: '.accordion-section-content:has(.customize-control-menu_item)',
				update: function() {
					var menuItemContainerIds = self.$sectionContent.sortable( 'toArray' ), menuItemIds;

					menuItemIds = $.map( menuItemContainerIds, function( menuItemContainerId ) {
						return parseInt( menuItemContainerId.replace( 'customize-control-nav_menus-' + self.params.menu_id + '-', '' ) );
					} );

					self.setting( menuItemIds );
				}
			} );

			/**
			 * Keyboard-accessible reordering.
			 */
			this.container.find( '.reorder-toggle' ).on( 'click keydown', function( event ) {
				if ( event.type === 'keydown' && ! ( event.which === 13 || event.which === 32 ) ) { // Enter or Spacebar
					return;
				}

				self.toggleReordering( ! self.isReordering );
			} );
		},

		/**
		 * Set up UI for adding a new menu item.
		 */
		_setupAddition: function() {
			var self = this;

			this.container.find( '.add-new-menu-item' ).on( 'click keydown', function( event ) {
				if ( event.type === 'keydown' && ! ( event.which === 13 || event.which === 32 ) ) { // Enter or Spacebar
					return;
				}

				if ( self.$sectionContent.hasClass( 'reordering' ) ) {
					return;
				}

				if ( ! $( 'body' ).hasClass( 'adding-menu-items' ) ) {
					api.Menus.availableMenuItemsPanel.open( self );
				} else {
					api.Menus.availableMenuItemsPanel.close();
				}
			} );
		},

		/**
		 * Move menu-delete button to section title. Actual deletion is managed with api.Menus.NewMenuControl.
		 */
		_setupDeletion: function() {
			var title = this.$controlSection.find( '.accordion-section-title' ),
				deleteBtn = this.container.find( '.menu-delete' );
			title.append( deleteBtn );
		},

		/**
		 * Add classes to the menu item controls to assist with styling.
		 */
		_applyCardinalOrderClassNames: function() {
			this.$sectionContent.find( '.customize-control-menu_item' )
				.removeClass( 'first-item' )
				.removeClass( 'last-item' )
				.find( '.menus-move-down, .menus-move-up' ).prop( 'tabIndex', 0 );

			this.$sectionContent.find( '.customize-control-menu_item:first' )
				.addClass( 'first-item' )
				.find( '.menus-move-up' ).prop( 'tabIndex', -1 );

			this.$sectionContent.find( '.customize-control-menu_item:last' )
				.addClass( 'last-item' )
				.find( '.menus-move-down' ).prop( 'tabIndex', -1 );
		},


		/***********************************************************************
		 * Begin public API methods
		 **********************************************************************/

		/**
		 * Enable/disable the reordering UI
		 *
		 * @param {Boolean} showOrHide to enable/disable reordering
		 */
		toggleReordering: function( showOrHide ) {
			showOrHide = Boolean( showOrHide );

			if ( showOrHide === this.$sectionContent.hasClass( 'reordering' ) ) {
				return;
			}

			this.isReordering = showOrHide;
			this.$sectionContent.toggleClass( 'reordering', showOrHide );

			if ( showOrHide ) {
				_( this.getMenuItemControls() ).each( function( formControl ) {
					formControl.collapseForm();
				} );
			}
		},

		/**
		 * @return {wp.customize.controlConstructor.menu_item[]}
		 */
		getMenuItemControls: function() {
			var self = this, formControls;

			formControls = _( this.setting() ).map( function( menuItemId ) {
				var settingId = menuItemIdToSettingId( menuItemId, self.params.menu_id ),
					formControl = api.control( settingId );

				if ( ! formControl ) {
					return;
				}

				return formControl;
			} );

			return formControls;
		},

		/**
		 * Add a new item to this menu.
		 *
		 * @param {int} itemObjectId
		 * @returns {object|false} menu_item control instance, or false on error
		 */
		addItemToMenu: function( item, callback ) {
			var self = this,
				params,
				placeholderContainer,
				processing,
				menuId = self.params.menu_id,
				menuControl = $( '#customize-control-nav_menus-' + menuId + '-controls' );

			_.templateSettings = {
				interpolate: /\{\{(.+?)\}\}/g
			};
			placeholderTemplate = _.template( api.Menus.data.tpl.loadingItemTemplate );

			// Insert a placeholder menu item into the menu.
			menuControl.before( placeholderTemplate({ data: item }) );

			placeholderContainer = menuControl.prev( '.nav-menu-inserted-item-loading' );

			callback = callback || function(){};

			// Trigger customizer processing state.
			processing = wp.customize.state( 'processing' );
			processing( processing() + 1 );

			params = {
				'action': 'add-menu-item-customizer',
				'menu': menuId,
				'customize-menu-item-nonce': api.Menus.data.nonce,
				'menu-item': item
			};

			$.post( ajaxurl, params, function( menuItemMarkup ) {
				var dbid, settingId, settingArgs, controlConstructor, menuItemControl, menuItems;

				menuItemMarkup = $.trim( menuItemMarkup ); // Trim leading whitespaces.
				dbid = $( menuItemMarkup ).first( '.menu-item' ).attr( 'id' );
				if ( ! dbid ) {
					// Something's wrong with the returned markup, bail.
					placeholderContainer.fadeOut( 'slow', function() { $( this ).remove(); } );
					return;
				}
				dbid = dbid.replace( 'menu-item-', '' );

				// Replace the placeholder with the control markup.
				placeholderContainer.html( menuItemMarkup )
									.attr( 'id', 'customize-control-nav_menus-' + menuId + '-' + dbid )
									.removeClass( 'nav-menu-inserted-item-loading' );

				// Make it stand out a bit more visually, by adding a fadeIn.
				// @todo try replacing this with a bouncing css transition; the hide part is awkward.
				placeholderContainer.hide().fadeIn('slow');

				// Register the new setting.
				settingId = 'nav_menus[' + menuId + '][' + dbid + ']';
				settingArgs = {
					transport: 'refresh',
					previewer: self.setting.previewer
				};
				api.create( settingId, settingId, {}, settingArgs );

				// Register the new control.
				controlConstructor = api.controlConstructor['menu_item'];
				menuItemControl = new controlConstructor( settingId, {
					params: {
						settings: {
							'default': settingId
						},
						menu_id: self.params.menu_id,
						menu_item_id: dbid,
						original_id: 0, // Set to 0 to avoid cloning when updated before publish.
						type: 'menu_item',
						depth: 0,
						position: self.setting._value.length
					},
					previewer: self.setting.previewer
				} );
				api.control.add( settingId, menuItemControl );
				// Make sure the panel hasn't been closed in the meantime.
				if ( $( 'body' ).hasClass( 'adding-menu-items' ) ) {
					// Move the delete button up to match the existing widgets.
					api.Menus.getMenuItemControl( dbid ).toggleDeletePosition( true );
					api.Menus.refreshVisibleMenuOptions();
				}

				// Add item to this menu.
				menuItems = self.setting().slice();
				if ( -1 === _.indexOf( menuItems, dbid ) ) {
					menuItems.push( dbid );
					self.setting( menuItems );
				}

				// Remove this level of the customizer processing state.
				processing( processing() - 1 );

				$( document ).trigger( 'menu-item-added', [ item ] );

				callback();
			});

		}
	} );

	/**
	 * wp.customize.Menus.NewMenuControl
	 *
	 * Customizer control for creating new menus and handling deletion of existing menus.
	 * Note that 'new_menu' must match the WP_New_Menu_Customize_Control::$type.
	 *
	 * @constructor
	 * @augments wp.customize.Control
	 */
	api.Menus.NewMenuControl = api.Control.extend({
		/**
		 * Set up the control.
		 */
		ready: function() {
			this._bindHandlers();
		},

		_bindHandlers: function() {
			var self = this,
				name = $( '#customize-control-new_menu_name input' ),
				submit = $( '#create-new-menu-submit' ),
				toggle = $( '#toggle-menu-delete' ),
				deleteBtns = $( '.menu-delete' );
			name.on( 'keydown', function( event ) {
				if ( event.which === 13 ) { // Enter.
					self.submit();
				}
			} );
			submit.on( 'click', function() {
				self.submit();
			} );
			toggle.on( 'click', function() {
				self.toggleDelete();
			} );
			deleteBtns.on( 'click', function( e ) {
				self.submitDelete( e.target );
				e.stopPropagation();
				e.preventDefault();
			} );
		},

		submit: function() {
			var self = this,
				processing,
				params,
				container = this.container.closest( '.accordion-section' ),
				name = container.find( '.menu-name-field' ).first(),
				spinner = container.find( '.spinner' );

			// Menu name is required.
			if ( ! name.val() ) {
				return false;
			}

			// Show spinner.
			spinner.show();

			// Trigger customizer processing state.
			processing = wp.customize.state( 'processing' );
			processing( processing() + 1 );

			params = {
				'action': 'add-nav-menu-customizer',
				'menu-name': name.val(),
				'customize-nav-menu-nonce': api.Menus.data.nonce,
			};

			$.post( ajaxurl, params, function( menuSectionMarkup ) {
				var menu_id, sectionId, settingIdName, settingIdControls,
					settingIdAuto, settingArgs, controlConstructor,
					menuControl, menuNameControl, menuAutoControl;

				menuSectionMarkup = $.trim( menuSectionMarkup ); // Trim leading whitespaces.
				sectionId = $( menuSectionMarkup ).first( '.accordion-section' ).attr( 'id' );
				if ( ! sectionId ) {
					// Something's wrong with the returned markup, bail.
					return false;
				}
				menu_id = sectionId.replace( 'accordion-section-nav_menus[', '' );
				menu_id = menu_id.replace( '[', '' );

				// Add the new menu to the DOM.
				container.before( menuSectionMarkup );
				$( '#' . sectionId ).hide().slideDown( 'slow' );

				// Register the new settings.
				settingIdName = 'nav_menus[' + menu_id + '][name]';
				settingArgs = {
					transport: 'refresh',
					previewer: self.setting.previewer
				};
				api.create( settingIdName, settingIdName, {}, settingArgs );
				settingIdControls = 'nav_menus[' + menu_id + '][controls]';
				api.create( settingIdControls, settingIdControls, {}, settingArgs );
				settingIdAuto = 'nav_menus[' + menu_id + '][auto_add]';
				api.create( settingIdAuto, settingIdAuto, {}, settingArgs );

				// Register the new menu name control.
				menuNameControl = new api.Control( settingIdName, {
					params: {
						settings: {
							'default': settingIdName
						},
					},
					previewer: self.setting.previewer
				} );
				api.control.add( settingIdName, menuNameControl );

				// Register the new menu auto-add control.
				menuAutoControl = new api.Control( settingIdAuto, {
					params: {
						settings: {
							'default': settingIdAuto
						},
					},
					previewer: self.setting.previewer
				} );
				api.control.add( settingIdAuto, menuAutoControl );

				// Register the new menu name control.
				controlConstructor = api.controlConstructor['nav_menu'];
				menuControl = new controlConstructor( settingIdControls, {
					params: {
						settings: {
							'default': settingIdControls
						},
					},
					previewer: self.setting.previewer
				} );
				api.control.add( settingIdControls, menuControl );

				// Remove this level of the customizer processing state.
				processing( processing() - 1 );

				// Hide spinner.
				spinner.hide();

				// Clear name field.
				name.val('');
			});

			return false;
		},

		// Toggles menu-deletion mode for all menus.
		toggleDelete: function() {
			var container = $( '#accordion-section-menus' ),
				sections = container.find( '.accordion-section-title' ),
				buttons = container.find( 'menu-delete');

			container.toggleClass( 'deleting-menus' );

			return false;
		},

		// Deletes a menu (pending user confirmation).
		submitDelete: function( el ) {
			var menu_id = $( el) .attr( 'id' ),
				section = $( el ).closest( '.accordion-section' ),
				next = section.next().find( '.accordion-section-title' );
			menu_id = menu_id.replace( 'delete-menu-', '' );
			if ( menu_id ) {
				// Prompt user with an AYS.
				if ( confirm( api.Menus.data.l10n.deleteWarn ) ) {
					section.addClass( 'deleting' );
					next.focus();
					// Delete the menu.
					params = {
						'action': 'delete-menu-customizer',
						'menu_id': menu_id,
						'customize-nav-menu-nonce': api.Menus.data.nonce
					};
					$.post( ajaxurl, params, function( success ) {
						// Remove the UI, once menu has been deleted.
						section.slideUp( 'slow', function() {
							section.remove();
						} );
					} );
				}
			}
		}
	});

	/**
	 * Extends wp.customizer.controlConstructor with control constructor for
	 * menu_item, nav_menu, and new_menu.
	 */
	$.extend( api.controlConstructor, {
		menu_item: api.Menus.MenuItemControl,
		nav_menu: api.Menus.MenuControl,
		new_menu: api.Menus.NewMenuControl
	});

	/**
	 * Capture the instance of the Previewer since it is private.
	 */
	OldPreviewer = api.Previewer;
	api.Previewer = OldPreviewer.extend( {
		initialize: function( params, options ) {
			api.Menus.Previewer = this;
			OldPreviewer.prototype.initialize.call( this, params, options );
			this.bind( 'refresh', this.refresh );
		}
	} );

	/**
	 * Init Customizer for menus.
	 */
	api.bind( 'ready', function() {
		// Set up the menu items panel.
		api.Menus.availableMenuItemsPanel = new api.Menus.AvailableMenuItemsPanelView({
			collection: api.Menus.availableMenuItems
		});
	} );

	/**
	 * Focus a menu item control.
	 *
	 * @param {string} menuItemId
	 */
	api.Menus.focusMenuItemControl = function( menuItemId ) {
		var control = api.Menus.getMenuItemControl( menuItemId );

		if ( control ) {
			control.focus();
		}
	},

	/**
	 * @param menu_id
	 * @return {wp.customize.controlConstructor.menus[]}
	 */
	api.Menus.getMenuControl = function( menu_id ) {
		var settingId, menuControl;

		settingId = 'nav_menus[' + menu_id + '][controls]';
		menuControl = api.control( settingId );

		if ( ! menuControl ) {
			return;
		}

		return menuControl;
	},

	/**
	 * Given a menu item id, find the menu control that contains it.
	 * @param {string} menuItemId
	 * @return {object|null}
	 */
	api.Menus.getMenuControlContainingItem = function( menuItemId ) {
		var foundControl = null;

		api.control.each( function( control ) {
			if ( control.params.type === 'menu' && -1 !== _.indexOf( control.setting(), menuItemId ) ) {
				foundControl = control;
			}
		} );

		return foundControl;
	};

	/**
	 * Given a menu item ID, get the control associated with it.
	 *
	 * @param {string} menuItemId
	 * @return {object|null}
	 */
	api.Menus.getMenuItemControl = function( menuItemId ) {
		var foundControl = null;

		api.control.each( function( control ) {
			if ( control.params.type === 'menu_item' && control.params.menu_item_id == menuItemId ) {
				foundControl = control;
			}
		} );

		return foundControl;
	};

	/**
	 * Show/hide the visible fields based on the screen options.
	 */
	api.Menus.refreshVisibleMenuOptions = function() {
		$( '.hide-column-tog' ).each( function() {
			var $t = $(this), column = $t.val();
			if ( $t.prop('checked') ) {
				$('.field-' + column).show();
			}
			else {
				$('.field-' + column).hide();
			}
		} );
	}

	/**
	 * @param {String} menuItemId
	 * @returns {String} settingId
	 */
	function menuItemIdToSettingId( menuItemId, menuId ) {
		return 'nav_menus[' + menuId + '][' + menuItemId + ']';
	}

	/**
	 * Update Section Title as menu name is changed and item handle title when label is changed.
	 */
	function setupUIPreviewing() {
		$( '#accordion-section-menus' ).on( 'input', '.live-update-section-title', function(e) {
			var el = $( e.currentTarget ),
				name = el.val(),
				title = el.closest( '.accordion-section' ).find( '.accordion-section-title' );
			// Empty names are not allowed (will not be saved), don't update to one.
			if ( name ) {
				title.html( name );
			}
		} );
		$( '#accordion-section-menus' ).on( 'input', '.edit-menu-item-title', function(e) {
			var input = $( e.currentTarget ), title, titleEl;
			title = input.val();
			titleEl = input.closest( '.menu-item' ).find( '.menu-item-title' );
			// Don't update to empty title.
			if ( title ) {
				titleEl.text( title )
				       .removeClass( 'no-title' );
			} else {
				titleEl.text( api.Menus.data.l10n.untitled )
				       .addClass( 'no-title' );
			}
		} );
	}

	$(document).ready(function(){ setupUIPreviewing(); });

})( window.wp, jQuery );
