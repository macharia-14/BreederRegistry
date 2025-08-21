// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

contract AnimalRegistry {
    struct Animal {
        string animalId;
        string animalType; // e.g., Cattle, Sheep, Goat, etc.
        string breed;      // Breed of the animal
        string gender;     // Male / Female
        string dob;        // Date of Birth
        string parent1;    // Sire ID (optional)
        string parent2;    // Dam ID (optional)
    }

    // Mapping from animalId to Animal record
    mapping(string => Animal) private animals;

    // Event for logging
    event AnimalRegistered(
        string animalId,
        string animalType,
        string breed,
        string gender,
        string dob,
        string parent1,
        string parent2
    );

    // Register a new animal
    function registerAnimal(
        string memory _id,
        string memory _animalType,
        string memory _breed,
        string memory _gender,
        string memory _dob,
        string memory _p1,
        string memory _p2
    ) public {
        require(bytes(animals[_id].animalId).length == 0, "Animal already registered");

        animals[_id] = Animal(_id, _animalType, _breed, _gender, _dob, _p1, _p2);

        emit AnimalRegistered(_id, _animalType, _breed, _gender, _dob, _p1, _p2);
    }

    // Get animal details
    function getAnimal(string memory _id)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        )
    {
        Animal memory a = animals[_id];
        require(bytes(a.animalId).length != 0, "Animal not found");

        return (
            a.animalId,
            a.animalType,
            a.breed,
            a.gender,
            a.dob,
            a.parent1,
            a.parent2
        );
    }
}
