
		$(document).on('click','.readMoreGenes',function(){
			if ( $(this).closest('.dragonBox').hasClass('full')) {
				$(this).closest('.dragonBox').removeClass('full');
			} else {
				$(this).closest('.dragonBox').addClass('full');
			}
		});
		$(document).on('click','#dragonFilter li[filter-this]',function() {
			console.log("Triggered");
			var descending = $(this).hasClass('descending');
			$('#dragonFilter li').removeClass('ascending descending sorted');
			$(this).addClass((!descending ? 'descending' : 'ascending' ) + " sorted");
			dragonView.sortBy({whatSort: $(this).attr('filter-this'), asc: !descending });
		});
		
		
		var dragonBaseData = ['eggnum','name','sex','seasonmate','maxMateable','totalmates','rarity','breed','species','colorGene','colorGeneVal','parents','children'];
		for (var idx in dragonBaseData) {
			$('#dragonFilter ul').append( $('<li>').text( dragonBaseData[idx].replace('-',' ') ).attr('filter-this',dragonBaseData[idx]) );
		}
	
		var rootGeneSets = [];
		var dragonView;
		function stringToClass(inString) {
			return inString ? inString.toLowerCase().replace(' ','-').replace('[^a-z]*','') : null;
		}
		
		
		function dragonViewModel(dragonData) {
			var self = this;
			rootGeneSets = dragonData.geneSets;
			self.geneSets = rootGeneSets;
			// Used for the 'add new Gene Type' stuff.
			self.dragonSet = ko.observableArray();
			self.sexes = dragonData.sexes;
			self.rarities = dragonData.rarities;
			console.log(dragonData.dragonSet);
			self.rebuildDragons = function(dragonSet) {
				self.dragonSet([]);
				for (var i in dragonSet) {
					self.dragonSet.push(new dragonBody(dragonSet[i]));
				}
			}
			self.rebuildDragons(dragonData.dragonSet);
			self.activeDragon = ko.observable( self.dragonSet()[0] );
			self.editDragon = function (dragonData) {
				self.activeDragon( dragonData );
			}
			self.sortBy = ko.observable({whatSort: 'eggnum', asc: false } );
			self.sortedDragons = ko.computed( function() {
				if (self.undoIng) return self.dragonSet().slice();
				return self.dragonSet().slice().sort( function(a, b) {
					console.log(self.sortBy() );
					if (  $.inArray(self.sortBy()['whatSort'],['seasonmate','colorgeneval','children','parents']) <= -1) {
						return (self.sortBy()['asc'] ? 1 : -1) * ( a[self.sortBy()['whatSort']]().toLowerCase() > 
								b[self.sortBy()['whatSort']]().toLowerCase() ? 1 : -1 );
					}
					return (self.sortBy()['asc'] ? 1 : -1) * ( a[self.sortBy()['whatSort']]() >
							b[self.sortBy()['whatSort']]() ? 1 : -1 );
				} );
			});
			
			self.undoPast = ko.observableArray();
			self.undoFuture = ko.observableArray();
			self.undoIndex = ko.observable(0);
			self.undoMax = ko.observable(20);
			self.undoIng = false;
			self.undoClass = ko.computed( function() {
				return "active-is-" + self.undoIndex();
			});
			self.undoAdd = ko.computed( function() {
				var lastOn, toAdd, continueOn = false;
				console.log("ddd");
				if (!self.undoIng) {
					toAdd = ko.toJSON(self.dragonSet() );
					if (self.undoPast().length > 0) {
						lastOn = self.undoPast.pop();
						self.undoPast.push(lastOn);
					} else {
						continueOn = true; 
					}
					if (continueOn || (lastOn != toAdd)) {
						self.undoPast.push(toAdd); //Add the last state onto the stack.
						self.undoFuture([]); //Empty the future. We've changed it.
						if (self.undoIndex() > self.undoMax) {
							self.undoPast.shift();  //Remove the oldest entry from the history.
						} else {
							self.undoIndex(self.undoIndex() + 1);  //Inc our location.
						}
						console.log("undone added");
					}
				} //Where I was last-- I just set up the undo navigation. I just need to set it in the script, though.
			});
			self.undoBoth = ko.computed(function() {
				var future = self.undoFuture();
				if (future.length > 0) {
					return self.undoPast().concat(future);
				}
				return self.undoPast();
			});
			self.undoLight = ko.computed(function() {
				return "which-" + $(this).index();
			});
			self.undoTo = function(whatHit, event) {
				var whichIdx = $(event.target).index(), lastCopy = self.undoBoth();
				self.undoIng = true;
				self.undoPast([]);
				self.undoFuture([]);
				
					self.undoPast(lastCopy.slice(0,whichIdx + 1));
				
				if (whichIdx <= self.undoMax() ) {
					self.undoFuture(lastCopy.slice(whichIdx + 1));
				}
				self.undoIndex(whichIdx + 1);
				self.rebuildDragons(JSON.parse(whatHit));
				self.undoIng = false;
				
						self.editDragon();
				return true;
			}
			self.undoBack = function() {
				var indexy = self.undoPast().length;
				if ( indexy > 0 && self.undoIndex() > 1) {
					self.undoIng = true;
					self.undoFuture.push(ko.toJSON(self.dragonSet()));
					self.rebuildDragons(JSON.parse(self.undoPast.pop()));
					self.undoIndex(self.undoIndex() - 1);
					self.undoIng = false;
				}
			}
			self.undoForward = function() {
				var available = self.undoFuture().length;
				if ( available > 0) {
					self.undoIng = true;
					self.undoPast.push(ko.toJSON(self.dragonSet()));
					self.rebuildDragons(JSON.parse(self.undoFuture.pop()));
					self.undoIndex(self.undoIndex() + 1);
					self.undoIng = false;
				}
			}
		}
		function dragonBody(myFeatures) {
			var self = this;
			for (var i in dragonBaseData) {
				self[dragonBaseData[i]] = ko.observable(myFeatures[dragonBaseData[i]] !== null ? myFeatures[dragonBaseData[i]] : (dragonBaseData[i] == 'maxMateable' ? 10 : null ));
			}
			if (myFeatures.images) {
				self.images = ko.observableArray(myFeatures.images);
			} else {
				self.images = ko.observableArray([null,null,null]);
			}
			self.images.active = ko.observable(self.images()[0]);
			//console.log(self.images()[0]);
			
			self.seasonmate.formatted = ko.computed( function() {
				return (self.sex() == 'female' && self.seasonmate() > 0 ? "Mated" : null);		
			});
			self.totalmates.formatted = ko.computed( function() {
				return self.totalmates() == self.maxMateable() ? 'Max Mated (' + self.maxMateable() + ')' : [self.totalmates(),'/',self.maxMateable()].join('');		
			});
			self.geneSets = ko.observableArray([]);
			self.geneSets.toCreate = ko.observable(null);
			var checkself = ( myFeatures.geneSets ? myFeatures.geneSets : [] );
			for (var i in checkself) {
				if ($.inArray(checkself[i]['geneSetName'], rootGeneSets['geneSets'] ) > -1 ) {
					self.geneSets.push( 
						 new dragonPropertySet(checkself[i]['geneSetName'],checkself[i]['nowGenes'])
					);
				}
			}
			self.geneSets.available = ko.computed(function() {
				var tempSets = rootGeneSets.geneSets.slice(0);
				for (var checkSet in self.geneSets()) {
					var isRootSet = $.inArray(self.geneSets()[checkSet].geneSetName, tempSets);
					if (isRootSet > -1) {
						tempSets.splice(isRootSet,1);
					}
				}
				return tempSets;
			});
			self.images.classSneak = ko.computed(function() {
				var outText;
				for (var i in dragonBaseData) {
					if ((dragonBaseData[i] != "parents" && dragonBaseData[i] != "children")
						&& !(/^[0-9]+$/.test(self[dragonBaseData[i]]() )) ){
						outText += " " + stringToClass(self[dragonBaseData[i]]());
					}
				}
				return "dragonBox border " + outText;
			});
			self.addGeneSet = function(thisGeneSet) {
				self.geneSets.push(new dragonPropertySet(self.geneSets.toCreate(),[]));
			}
			self.deleteGeneSet = function(thisGeneSet) { self.geneSets.remove(thisGeneSet); } 
		}
		dragonBody.prototype.changeImg = function(imageData) { self.images.active(imageData); }
		
		function dragonPropertySet(geneSetName,genesIn) {
			var self = this;
			self.nowGenes = ko.observableArray([]);
			self.geneSetName = geneSetName;
			self.nowGenes.toMake = ko.observable(null);
			for (var i in genesIn) {
				if ($.inArray(genesIn[i]['gene'], rootGeneSets['genesTherein'][geneSetName] ) > -1) {
					self.nowGenes.push(
						new dragonGene(genesIn[i]['gene'],genesIn[i]['geneVal']) 
						);
				}
			}
			self.nowGenes.available = ko.computed(function() {
				var tempSets = rootGeneSets.genesTherein[self.geneSetName].slice(0);
				for (var checkGene in self.nowGenes() ) { 
					var isRootGene = $.inArray(self.nowGenes()[checkGene].gene, tempSets);
					if (isRootGene > -1) {
						tempSets.splice(isRootGene,1);
					}
				}
				return tempSets;
			});
			self.deleteGene = function(gene) { self.nowGenes.remove(gene); }
			self.addGene = function(gene) { 
				self.nowGenes.push(new dragonGene(self.nowGenes.toMake(),null) ); 
			}
		}
		
		function dragonGene(geneName,geneValue) {
			var self = this;
			this.gene = geneName;
			this.geneVal = ko.observable(geneValue);
			this.geneRowCalc = ko.computed(function() {
				return (self.geneName ? ['genes',['gene',stringToClass(self.geneName)].join('-')].join(' ') : '');
			});
		}
		
		$.ajax({
			url:'dragons.json',
			dataType: 'json',
			success: function(data){
				dragonView = new dragonViewModel(data);
				ko.applyBindings(dragonView);
				console.log ( ko.toJSON(dragonView) );
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("Sorry, looks like there was a problem with teh JSON file?");
			}
		});