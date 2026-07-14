create database if not exists employee;
use employee;

create table yamatoEmployee(
	empId int auto_increment primary key,
    name varchar(50) ,
    email varchar(50) unique default('@yamato-india.co.in'),
    mob_number bigint unique,
    department varchar(10),
    designation varchar(10)
);
drop table yamatoemployee;

insert into yamatoEmployee values ('2','Deepika hans','deepi@yamato-india.co.in',9924048431,'Accounts','Manager');
insert into yamatoEmployee values (3,'krishna soni','krisss.hhhnnnaa@gmail.com',9636516379,'IT','Intern');
insert into yamatoEmployee values ('1','Deepak soni','deepak@yamato-india.co.in',9922138431,'IT','Manager');

select * from yamatoemployee;