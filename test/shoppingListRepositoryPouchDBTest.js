"use strict";

const chai = require("chai");
const should = chai.should();
chai.use(require("chai-immutable"));
chai.use(require("chai-as-promised"));
chai.use(require("chai-string"));
const sinon = require("sinon");
const PouchDB = require("pouchdb-memory");
PouchDB.plugin(require("pouchdb-find"));

const { ShoppingListFactory } = require("../src/ShoppingListFactory");
const { ShoppingListRepositoryPouchDB } = require("../src/ShoppingListRepositoryPouchDB");
const { Record, List } = require("immutable");

describe("a Shopping List Repository for PouchDB", function() {

  before(function() {
    this.clock = sinon.useFakeTimers(1504060808000);
  });

  beforeEach(function() {
    this.shoppingListFactory = new ShoppingListFactory();
    this.db = new PouchDB("test");
    this.shoppingListRepository = new ShoppingListRepositoryPouchDB(this.db);
  });

  afterEach(function() {
    return this.db.destroy();
  });

  after(function() {
    this.clock.restore();
  });

  it("should create a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      groceriesAfterPost.should.be.an.instanceof(Record);
      groceriesAfterPost._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("list:");
      groceriesAfterPost.should.have.deep.property("_rev").that.is.a("string");
      groceriesAfterPost.should.have.deep.property("type", "list");
      groceriesAfterPost.should.have.deep.property("version", 1);
      groceriesAfterPost.should.have.deep.property("title", "Groceries");
      groceriesAfterPost.should.have.deep.property("checked", false);
      groceriesAfterPost.should.have.deep.property("place", undefined);
      groceriesAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      groceriesAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
    }).should.notify(done);
  });

  it("should read a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let revAfterPost;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      revAfterPost = groceriesAfterPost._rev;
      return this.shoppingListRepository.get(groceriesAfterPost._id);
    }).should.be.fulfilled.then(groceriesAfterGet => {
      groceriesAfterGet.should.be.an.instanceof(Record);
      groceriesAfterGet._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("list:");
      groceriesAfterGet.should.have.deep.property("_rev").that.is.a("string").and.does.equal(revAfterPost);
      groceriesAfterGet.should.have.deep.property("type", "list");
      groceriesAfterGet.should.have.deep.property("version", 1);
      groceriesAfterGet.should.have.deep.property("title", "Groceries");
      groceriesAfterGet.should.have.deep.property("checked", false);
      groceriesAfterGet.should.have.deep.property("place", undefined);
      groceriesAfterGet.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      groceriesAfterGet.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
    }).should.notify(done);
  });

  it("should find a List of Shopping Lists", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    const campingSupplies = this.shoppingListFactory.newShoppingList({
      title: "Camping Supplies"
    });
    const listOfShoppingLists = this.shoppingListFactory.newListOfShoppingLists([groceries, campingSupplies]);
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.postBulk(listOfShoppingLists);
    }).should.be.fulfilled.then(listOfShoppingListsAfterPost => {
      return this.shoppingListRepository.find();
    }).should.be.fulfilled.then(listOfShoppingListsAfterFind => {
      List.isList(listOfShoppingListsAfterFind).should.be.true;
      listOfShoppingListsAfterFind.isEmpty().should.be.false;
      listOfShoppingListsAfterFind.size.should.equal(2);
      const groceriesAfterFind = listOfShoppingListsAfterFind.get(0);
      const campingSuppliesAfterFind = listOfShoppingListsAfterFind.get(1);
      groceriesAfterFind.should.have.deep.property("_id", groceries._id);
      groceriesAfterFind.should.have.deep.property("_rev").that.is.a("string");
      groceriesAfterFind.should.have.deep.property("type", "list");
      groceriesAfterFind.should.have.deep.property("title", "Groceries");
      groceriesAfterFind.should.have.deep.property("checked", false);
      groceriesAfterFind.should.have.deep.property("place", undefined);
      groceriesAfterFind.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      groceriesAfterFind.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
      campingSuppliesAfterFind.should.have.deep.property("_id", campingSupplies._id);
      campingSuppliesAfterFind.should.have.deep.property("_rev").that.is.a("string");
      campingSuppliesAfterFind.should.have.deep.property("type", "list");
      campingSuppliesAfterFind.should.have.deep.property("title", "Camping Supplies");
      campingSuppliesAfterFind.should.have.deep.property("checked", false);
      campingSuppliesAfterFind.should.have.deep.property("place", undefined);
      campingSuppliesAfterFind.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      campingSuppliesAfterFind.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
    }).should.notify(done);
  });

  it("should update a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let revAfterPost;
    let clock;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      revAfterPost = groceriesAfterPost._rev;
      const groceriesAfterPostUpdated = groceriesAfterPost.set("checked", true);
      clock = sinon.useFakeTimers(1504060809314);
      return this.shoppingListRepository.put(groceriesAfterPostUpdated);
    }).should.be.fulfilled.then(groceriesAfterPut => {
      groceriesAfterPut.should.be.an.instanceof(Record);
      groceriesAfterPut._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("list:");
      groceriesAfterPut.should.have.deep.property("_rev").that.is.a("string").and.does.not.equal(revAfterPost);
      groceriesAfterPut.should.have.deep.property("type", "list");
      groceriesAfterPut.should.have.deep.property("version", 1);
      groceriesAfterPut.should.have.deep.property("title", "Groceries");
      groceriesAfterPut.should.have.deep.property("checked", true);
      groceriesAfterPut.should.have.deep.property("place", undefined);
      groceriesAfterPut.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      groceriesAfterPut.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
    }).should.notify(done);
  });

  it("should delete a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let idAfterPost;
    let revAfterPost;
    let clock;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      idAfterPost = groceriesAfterPost._id;
      revAfterPost = groceriesAfterPost._rev;
      clock = sinon.useFakeTimers(1504060809314);
      return this.shoppingListRepository.delete(groceriesAfterPost);
    }).should.be.fulfilled.then(groceriesAfterDelete => {
      groceriesAfterDelete.should.be.an.instanceof(Record);
      groceriesAfterDelete._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("list:");
      groceriesAfterDelete.should.have.deep.property("_rev").that.is.a("string").and.does.not.equal(revAfterPost);
      groceriesAfterDelete.should.have.deep.property("_deleted", true);
      groceriesAfterDelete.should.have.deep.property("type", "list");
      groceriesAfterDelete.should.have.deep.property("version", 1);
      groceriesAfterDelete.should.have.deep.property("title", "Groceries");
      groceriesAfterDelete.should.have.deep.property("checked", false);
      groceriesAfterDelete.should.have.deep.property("place", undefined);
      groceriesAfterDelete.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      groceriesAfterDelete.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
      return this.shoppingListRepository.get(idAfterPost).should.be.rejectedWith(Error);
    }).should.notify(done);
  });

  it("should create a Shopping List Item", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      const mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      return this.shoppingListRepository.postItem(mangos);
    }).should.be.fulfilled.then(mangosAfterPost => {
      mangosAfterPost.should.be.an.instanceof(Record);
      mangosAfterPost._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("item:");
      mangosAfterPost.should.have.deep.property("_rev").that.is.a("string");
      mangosAfterPost.should.have.deep.property("type", "item");
      mangosAfterPost.should.have.deep.property("version", 1);
      mangosAfterPost.should.have.deep.property("list", groceries._id);
      mangosAfterPost.should.have.deep.property("title", "Mangos");
      mangosAfterPost.should.have.deep.property("checked", false);
      mangosAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      mangosAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
    }).should.notify(done);
  });

  it("should create Shopping List Items in bulk", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let clock;
    let mangos;
    let oranges;
    let pears;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      clock = sinon.useFakeTimers(1504060809314);
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges"
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      const listOfGroceriesItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears]);
      return this.shoppingListRepository.postItemsBulk(listOfGroceriesItems);
    }).should.be.fulfilled.then(listOfGroceriesItemsAfterPost => {
      List.isList(listOfGroceriesItemsAfterPost).should.be.true;
      listOfGroceriesItemsAfterPost.isEmpty().should.be.false;
      listOfGroceriesItemsAfterPost.size.should.equal(3);
      const mangosAfterPost = listOfGroceriesItemsAfterPost.get(0);
      const orangesAfterPost = listOfGroceriesItemsAfterPost.get(1);
      const pearsAfterPost = listOfGroceriesItemsAfterPost.get(2);
      mangosAfterPost.should.have.deep.property("_id", mangos._id);
      mangosAfterPost.should.have.deep.property("_rev").that.is.a("string");
      mangosAfterPost.should.have.deep.property("type", "item");
      mangosAfterPost.should.have.deep.property("list", groceries._id);
      mangosAfterPost.should.have.deep.property("title", "Mangos");
      mangosAfterPost.should.have.deep.property("checked", false);
      mangosAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      mangosAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      orangesAfterPost.should.have.deep.property("_id", oranges._id);
      orangesAfterPost.should.have.deep.property("_rev").that.is.a("string");
      orangesAfterPost.should.have.deep.property("type", "item");
      orangesAfterPost.should.have.deep.property("list", groceries._id);
      orangesAfterPost.should.have.deep.property("title", "Oranges");
      orangesAfterPost.should.have.deep.property("checked", false);
      orangesAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      orangesAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      pearsAfterPost.should.have.deep.property("_id", pears._id);
      pearsAfterPost.should.have.deep.property("_rev").that.is.a("string");
      pearsAfterPost.should.have.deep.property("type", "item");
      pearsAfterPost.should.have.deep.property("list", groceries._id);
      pearsAfterPost.should.have.deep.property("title", "Pears");
      pearsAfterPost.should.have.deep.property("checked", false);
      pearsAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      pearsAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
    }).should.notify(done);
  });

  it("should read a Shopping List Item", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let revAfterPost;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      const mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      return this.shoppingListRepository.postItem(mangos);
    }).should.be.fulfilled.then(mangosAfterPost => {
      revAfterPost = mangosAfterPost._rev;
      return this.shoppingListRepository.getItem(mangosAfterPost._id);
    }).should.be.fulfilled.then(mangosAfterGet => {
      mangosAfterGet.should.be.an.instanceof(Record);
      mangosAfterGet._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("item:");
      mangosAfterGet.should.have.deep.property("_rev").that.is.a("string").and.does.equal(revAfterPost);
      mangosAfterGet.should.have.deep.property("type", "item");
      mangosAfterGet.should.have.deep.property("version", 1);
      mangosAfterGet.should.have.deep.property("title", "Mangos");
      mangosAfterGet.should.have.deep.property("checked", false);
      mangosAfterGet.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      mangosAfterGet.should.have.deep.property("updatedAt", "2017-08-30T02:40:08.000Z");
    }).should.notify(done);
  });

  it("should find a List of Shopping List Items for a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let clock;
    let mangos;
    let oranges;
    let pears;
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.post(groceries);
    }).should.be.fulfilled.then(groceriesAfterPost => {
      clock = sinon.useFakeTimers(1504060809314);
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges"
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      const listOfGroceriesItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears]);
      return this.shoppingListRepository.postItemsBulk(listOfGroceriesItems);
    }).should.be.fulfilled.then(listOfGroceriesItemsAfterPost => {
      return this.shoppingListRepository.findItems({
        selector: {
          type: "item",
          list: groceries._id
        }
      });
    }).should.be.fulfilled.then(listOfGroceriesItemsAfterFind => {
      List.isList(listOfGroceriesItemsAfterFind).should.be.true;
      listOfGroceriesItemsAfterFind.isEmpty().should.be.false;
      listOfGroceriesItemsAfterFind.size.should.equal(3);
      const mangosAfterPost = listOfGroceriesItemsAfterFind.get(0);
      const orangesAfterPost = listOfGroceriesItemsAfterFind.get(1);
      const pearsAfterPost = listOfGroceriesItemsAfterFind.get(2);
      mangosAfterPost.should.have.deep.property("_id", mangos._id);
      mangosAfterPost.should.have.deep.property("_rev").that.is.a("string");
      mangosAfterPost.should.have.deep.property("type", "item");
      mangosAfterPost.should.have.deep.property("list", groceries._id);
      mangosAfterPost.should.have.deep.property("title", "Mangos");
      mangosAfterPost.should.have.deep.property("checked", false);
      mangosAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      mangosAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      orangesAfterPost.should.have.deep.property("_id", oranges._id);
      orangesAfterPost.should.have.deep.property("_rev").that.is.a("string");
      orangesAfterPost.should.have.deep.property("type", "item");
      orangesAfterPost.should.have.deep.property("list", groceries._id);
      orangesAfterPost.should.have.deep.property("title", "Oranges");
      orangesAfterPost.should.have.deep.property("checked", false);
      orangesAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      orangesAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      pearsAfterPost.should.have.deep.property("_id", pears._id);
      pearsAfterPost.should.have.deep.property("_rev").that.is.a("string");
      pearsAfterPost.should.have.deep.property("type", "item");
      pearsAfterPost.should.have.deep.property("list", groceries._id);
      pearsAfterPost.should.have.deep.property("title", "Pears");
      pearsAfterPost.should.have.deep.property("checked", false);
      pearsAfterPost.should.have.deep.property("createdAt", "2017-08-30T02:40:09.314Z");
      pearsAfterPost.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
    }).should.notify(done);
  });

  it("should find the count of Shopping List Items for a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let mangos;
    let oranges;
    let pears;
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.post(groceries);
    }).should.be.fulfilled.then(groceriesAfterPost => {
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges"
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      const listOfGroceriesItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears]);
      return this.shoppingListRepository.postItemsBulk(listOfGroceriesItems);
    }).should.be.fulfilled.then(listOfGroceriesItemsAfterPost => {
      return this.shoppingListRepository.findItemsCountByList({
        selector: {
          type: "item",
          list: groceries._id
        },
        fields: [ "list" ]
      });
    }).should.be.fulfilled.then(groceriesItemsCount => {
      groceriesItemsCount.get(groceries._id).should.equal(3);
    }).should.notify(done);
  });

  it("should find the count of checked Shopping List Items for a Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let mangos;
    let oranges;
    let pears;
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.post(groceries);
    }).should.be.fulfilled.then(groceriesAfterPost => {
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos",
        checked: true,
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges",
        checked: true
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      const listOfGroceriesItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears]);
      return this.shoppingListRepository.postItemsBulk(listOfGroceriesItems);
    }).should.be.fulfilled.then(listOfGroceriesItemsAfterPost => {
      return this.shoppingListRepository.findItemsCountByList({
        selector: {
          type: "item",
          list: groceries._id,
          checked: true
        },
        fields: [ "list" ]
      });
    }).should.be.fulfilled.then(groceriesItemsCheckedCount => {
      groceriesItemsCheckedCount.get(groceries._id).should.equal(2);
    }).should.notify(done);
  });

  it("should find the count of Shopping List Items by Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let mangos;
    let oranges;
    let pears;
    const campingSupplies = this.shoppingListFactory.newShoppingList({
      title: "Camping Supplies"
    });
    let carabiners;
    let socks;
    const listOfShoppingLists = this.shoppingListFactory.newListOfShoppingLists([groceries, campingSupplies]);
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.postBulk(listOfShoppingLists);
    }).should.be.fulfilled.then(groceriesAfterPost => {
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges"
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      carabiners = this.shoppingListFactory.newShoppingListItem({
        title: "Carabiners"
      }, campingSupplies);
      socks = this.shoppingListFactory.newShoppingListItem({
        title: "Socks"
      }, campingSupplies);
      const listOfListItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears, carabiners, socks]);
      return this.shoppingListRepository.postItemsBulk(listOfListItems);
    }).should.be.fulfilled.then(listOfListItemsAfterPost => {
      return this.shoppingListRepository.findItemsCountByList();
    }).should.be.fulfilled.then(listItemsCount => {
      listItemsCount.size.should.equal(2);
      listItemsCount.get(groceries._id).should.equal(3);
      listItemsCount.get(campingSupplies._id).should.equal(2);
    }).should.notify(done);
  });

  it("should find the count of checked Shopping List Items by Shopping List", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let mangos;
    let oranges;
    let pears;
    const campingSupplies = this.shoppingListFactory.newShoppingList({
      title: "Camping Supplies"
    });
    let carabiners;
    let socks;
    const listOfShoppingLists = this.shoppingListFactory.newListOfShoppingLists([groceries, campingSupplies]);
    this.shoppingListRepository.ensureIndexes().should.be.fulfilled.then(result => {
      return this.shoppingListRepository.postBulk(listOfShoppingLists);
    }).should.be.fulfilled.then(groceriesAfterPost => {
      mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos",
        checked: true
      }, groceries);
      oranges = this.shoppingListFactory.newShoppingListItem({
        title: "Oranges",
        checked: true
      }, groceries);
      pears = this.shoppingListFactory.newShoppingListItem({
        title: "Pears"
      }, groceries);
      carabiners = this.shoppingListFactory.newShoppingListItem({
        title: "Carabiners",
        checked: true
      }, campingSupplies);
      socks = this.shoppingListFactory.newShoppingListItem({
        title: "Socks"
      }, campingSupplies);
      const listOfListItems = this.shoppingListFactory.newListOfShoppingListItems([mangos, oranges, pears, carabiners, socks]);
      return this.shoppingListRepository.postItemsBulk(listOfListItems);
    }).should.be.fulfilled.then(listOfListItemsAfterPost => {
      return this.shoppingListRepository.findItemsCountByList({
        selector: {
          type: "item",
          checked: true
        },
        fields: [ "list" ]
      });
    }).should.be.fulfilled.then(listItemsCount => {
      listItemsCount.size.should.equal(2);
      listItemsCount.get(groceries._id).should.equal(2);
      listItemsCount.get(campingSupplies._id).should.equal(1);
    }).should.notify(done);
  });

  it("should update a Shopping List Item", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let revAfterPost;
    let clock;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      const mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      return this.shoppingListRepository.postItem(mangos);
    }).should.be.fulfilled.then(mangosAfterPost => {
      revAfterPost = mangosAfterPost._rev;
      const mangosAfterPostUpdated = mangosAfterPost.set("checked", true);
      clock = sinon.useFakeTimers(1504060809314);
      return this.shoppingListRepository.putItem(mangosAfterPostUpdated);
    }).should.be.fulfilled.then(mangosAfterPut => {
      mangosAfterPut.should.be.an.instanceof(Record);
      mangosAfterPut._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("item:");
      mangosAfterPut.should.have.deep.property("_rev").that.is.a("string").and.does.not.equal(revAfterPost);
      mangosAfterPut.should.have.deep.property("type", "item");
      mangosAfterPut.should.have.deep.property("version", 1);
      mangosAfterPut.should.have.deep.property("title", "Mangos");
      mangosAfterPut.should.have.deep.property("checked", true);
      mangosAfterPut.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      mangosAfterPut.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
    }).should.notify(done);
  });

  it("should delete a Shopping List Item", function(done) {
    const groceries = this.shoppingListFactory.newShoppingList({
      title: "Groceries"
    });
    let idAfterPost;
    let revAfterPost;
    let clock;
    this.shoppingListRepository.post(groceries).should.be.fulfilled.then(groceriesAfterPost => {
      const mangos = this.shoppingListFactory.newShoppingListItem({
        title: "Mangos"
      }, groceries);
      return this.shoppingListRepository.postItem(mangos);
    }).should.be.fulfilled.then(mangosAfterPost => {
      idAfterPost = mangosAfterPost._id;
      revAfterPost = mangosAfterPost._rev;
      clock = sinon.useFakeTimers(1504060809314);
      return this.shoppingListRepository.deleteItem(mangosAfterPost);
    }).should.be.fulfilled.then(mangosAfterDelete => {
      mangosAfterDelete.should.be.an.instanceof(Record);
      mangosAfterDelete._id.should.be.a("string")
        .with.length(30)
        .that.is.a.singleLine()
        .and.startsWith("item:");
      mangosAfterDelete.should.have.deep.property("_rev").that.is.a("string").and.does.not.equal(revAfterPost);
      mangosAfterDelete.should.have.deep.property("_deleted", true);
      mangosAfterDelete.should.have.deep.property("type", "item");
      mangosAfterDelete.should.have.deep.property("version", 1);
      mangosAfterDelete.should.have.deep.property("title", "Mangos");
      mangosAfterDelete.should.have.deep.property("checked", false);
      mangosAfterDelete.should.have.deep.property("createdAt", "2017-08-30T02:40:08.000Z");
      mangosAfterDelete.should.have.deep.property("updatedAt", "2017-08-30T02:40:09.314Z");
      clock.restore();
      return this.shoppingListRepository.getItem(idAfterPost).should.be.rejectedWith(Error);
    }).should.notify(done);
  });

});
